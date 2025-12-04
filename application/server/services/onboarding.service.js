import { parse } from "csv-parse/sync";
import User from "../models/user.js";
import Profile from "../models/profile.js";
import { addMembersToCohort } from "./cohort.service.js"; // you already have this from Req1
import bcrypt from 'bcrypt';
const ROUNDS = 10;

export function parseCsvToJobSeekerRows(fileBuffer) {
  const text = fileBuffer.toString("utf8");

const records = parse(text, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

  return records.map((row, index) => {
    const email = (row.email || "").toLowerCase().trim();
    return {
      _row: index + 2, // account for header row
      firstName: (row.firstName || "").trim(),
      lastName: (row.lastName || "").trim(),
      email,
      gradYear: row.gradYear ? Number(row.gradYear) : undefined,
      program: (row.program || "").trim() || undefined,
      tags: row.tags
        ? row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
  });
}

export async function bulkUpsertJobSeekers({
  organizationId,
  rows,
  cohortId,
}) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.statusCode = 400;
    throw error;
  }

  const summary = {
    created: 0,
    updated: 0,
    reactivated: 0,
    addedToCohort: 0,
    errors: [],
  };

  const validRows = rows.filter((r) => {
    if (!r.email) {
      summary.errors.push({
        row: r._row,
        error: "Missing email",
      });
      return false;
    }
    return true;
  });

  if (!validRows.length) {
    return summary;
  }

  const emails = validRows.map((r) => r.email);

  const existingUsers = await User.find({
    organizationId,
    email: { $in: emails },
  }).lean();

  const existingByEmail = existingUsers.reduce((acc, u) => {
    acc[u.email.toLowerCase()] = u;
    return acc;
  }, {});

  const usersToCreate = [];
  const profilesToCreate = [];
  const profilesToUpdate = [];

  const affectedUserIds = [];

  for (const row of validRows) {
    const existing = existingByEmail[row.email];

    if (existing) {
      affectedUserIds.push(existing._id.toString());

      const update = {
        userId: existing._id.toString(),
        gradYear: row.gradYear,
        program: row.program,
        tags: row.tags,
        firstName: row.firstName,
        lastName: row.lastName,
      };

      profilesToUpdate.push(update);

      if (existing.isDeleted) {
        await User.updateOne(
          { _id: existing._id },
          { $set: { isDeleted: false } }
        );
        summary.reactivated += 1;
      } else {
        summary.updated += 1;
      }
    } else {
      let password = await bcrypt.hash(row.lastName+row.firstName+row.gradYear, ROUNDS);
      const userDoc = new User({
        email: row.email,
        role: "job_seeker",
        organizationId,
        isDeleted: false,
        passwordHash: password
      });

      usersToCreate.push(userDoc);
    }
  }

  if (usersToCreate.length) {
    const createdUsers = await User.insertMany(usersToCreate, { ordered: false });
    console.log("Here",createdUsers,usersToCreate)
    for (let i = 0; i < createdUsers.length; i++) {
      const u = createdUsers[i];
      const row = validRows.find((r) => r.email === u.email) || {};

      profilesToCreate.push({
        userId: u._id.toString(),
        fullName: [row.firstName, row.lastName].filter(Boolean).join(" "),
        email: u.email,
        headline: row.program || "",
        gradYear: row.gradYear,
        program: row.program,
        tags: row.tags,
      });

      affectedUserIds.push(u._id.toString());
      summary.created += 1;
    }
  }

  if (profilesToCreate.length) {
    await Profile.insertMany(
      profilesToCreate.map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        email: p.email,
        headline: p.headline,
        gradYear: p.gradYear,
        program: p.program,
        tags: p.tags,
      })),
      { ordered: false }
    );
  }

  for (const p of profilesToUpdate) {
    const update = {};

    if (p.firstName || p.lastName) {
      update.fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
    }
    if (p.gradYear !== undefined) update.gradYear = p.gradYear;
    if (p.program !== undefined) update.program = p.program;
    if (p.tags && p.tags.length) update.tags = p.tags;

    if (Object.keys(update).length) {
      await Profile.updateOne({ userId: p.userId }, { $set: update });
    }
  }

  if (cohortId && affectedUserIds.length) {
    const { memberCount } = await addMembersToCohort({
      cohortId,
      organizationId,
      jobSeekerUserIds: affectedUserIds,
      source: "import",
    });
    summary.addedToCohort = memberCount;
  }

  return summary;
}
