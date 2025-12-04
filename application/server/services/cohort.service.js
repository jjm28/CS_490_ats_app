// services/cohort.service.js
import Cohort from "../models/Cohort/Cohort.js";
import CohortMember from "../models/Cohort/CohortMember.js";
import User from "../models/user.js"; // adjust path as needed
import Profile from "../models/profile.js"; // to display names/emails
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";

export async function searchOrgJobSeekers({
  organizationId,
  query,
  limit = 10,
}) {
  if (!organizationId) throw new Error("organizationId is required");

  const q = (query || "").trim().toLowerCase();

  // Find all job seekers for this org
  const users = await User.find({
    organizationId,
    role: "job_seeker",
  })
    .select("_id email firstName lastName")
    .lean();

  const userIds = users.map((u) => u._id.toString());

  const profiles = await Profile.find({ userId: { $in: userIds } }).lean();

  const profilesByUserId = profiles.reduce((acc, p) => {
    acc[p.userId] = p;
    return acc;
  }, {});

  const results = users
    .map((u) => {
      const profile = profilesByUserId[u._id.toString()];
      const fullName =
        profile?.fullName ||
        `${u.firstName || ""} ${u.lastName || ""}`.trim();

      const headline = profile?.headline || "";

      // If no query, we just return everyone (limited later)
      if (q) {
        const email = (u.email || "").toLowerCase();
        const nameLower = (fullName || "").toLowerCase();

        const hit =
          email.includes(q) ||
          nameLower.includes(q) ||
          headline.toLowerCase().includes(q);

        if (!hit) return null;
      }

      return {
        userId: u._id.toString(),
        email: u.email,
        fullName: fullName || "",
        headline,
      };
    })
    .filter(Boolean)
    .slice(0, limit);

  return { items: results };
}

export async function createCohort({
  organizationId,
  createdByUserId,
  name,
  description,
  tags = [],
}) {
  if (!organizationId || !createdByUserId || !name) {
    throw new Error("organizationId, createdByUserId and name are required");
  }

  const cohort = await Cohort.create({
    organizationId,
    createdByUserId,
    name,
    description: description || "",
    tags,
  });

  return cohort.toObject();
}

export async function listCohorts({
  organizationId,
  status,
  search,
  page = 1,
  pageSize = 20,
}) {
  if (!organizationId) throw new Error("organizationId is required");

  const query = { organizationId };
  if (status) query.status = status;

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    Cohort.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Cohort.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCohort({ cohortId, organizationId }) {
  const cohort = await Cohort.findOne({
    _id: cohortId,
    organizationId,
  }).lean();

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.statusCode = 404;
    throw error;
  }

  return cohort;
}

export async function updateCohort({ cohortId, organizationId, updates }) {
  const allowed = ["name", "description", "tags", "status"];
  const safeUpdates = {};

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }

  const cohort = await Cohort.findOneAndUpdate(
    { _id: cohortId, organizationId },
    { $set: safeUpdates },
    { new: true }
  ).lean();

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.statusCode = 404;
    throw error;
  }

  return cohort;
}

export async function archiveCohort({ cohortId, organizationId }) {
  return updateCohort({
    cohortId,
    organizationId,
    updates: { status: "archived" },
  });
}

export async function listCohortMembers({
  cohortId,
  organizationId,
  search,
  page = 1,
  pageSize = 25,
}) {
  // ensure cohort belongs to org
  const cohort = await Cohort.findOne({
    _id: cohortId,
    organizationId,
  }).lean();

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.statusCode = 404;
    throw error;
  }

  const skip = (page - 1) * pageSize;

  const memberQuery = { cohortId };

  const [members, total] = await Promise.all([
    CohortMember.find(memberQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    CohortMember.countDocuments(memberQuery),
  ]);

  const userIds = members.map((m) =>  m.jobSeekerUserId);
  let usersById = {};
  let profilesByUserId = {};

  if (userIds.length > 0) {
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select("_id email role organizationId")
        .lean(),
      Profile.find({ userId: { $in: userIds } }).lean(),
    ]);

    usersById = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {});

    profilesByUserId = profiles.reduce((acc, p) => {
      acc[p.userId] = p;
      return acc;
    }, {});
  }

  const items = members
    .map((m) => {
      const user = usersById[m.jobSeekerUserId];
      const profile = profilesByUserId[m.jobSeekerUserId];

      if (!user) return null;

      const fullName =
        profile?.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim();

      // basic text search filter on name/email if requested
      if (search) {
        const s = search.toLowerCase();
        const hit =
          fullName.toLowerCase().includes(s) ||
          (user.email || "").toLowerCase().includes(s);
        if (!hit) return null;
      }

      return {
        _id: m._id.toString(),
        cohortId: m.cohortId.toString(),
        jobSeekerUserId: m.jobSeekerUserId,
        joinedAt: m.joinedAt,
        source: m.source,
        user: {
          _id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
        profile: {
          fullName: fullName || "",
          headline: profile?.headline || "",
        },
      };
    })
    .filter(Boolean);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function addMembersToCohort({
  cohortId,
  organizationId,
  jobSeekerUserIds = [],
  source = "manual",
}) {
  if (!jobSeekerUserIds.length) return { addedCount: 0 };

  const cohort = await Cohort.findOne({
    _id: cohortId,
    organizationId,
  });

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.statusCode = 404;
    throw error;
  }

  const docs = jobSeekerUserIds.map((id) => ({
    cohortId: cohort._id,
    jobSeekerUserId: id,
    source,
  }));

  // ignore duplicates via unique index
  await CohortMember.insertMany(docs, { ordered: false }).catch(() => {});

  const newMemberCount = await CohortMember.countDocuments({
    cohortId: cohort._id,
  });

  cohort.memberCount = newMemberCount;
  await cohort.save();

  return { memberCount: newMemberCount };
}

export async function removeMembersFromCohort({
  cohortId,
  organizationId,
  jobSeekerUserIds = [],
}) {
  const cohort = await Cohort.findOne({
    _id: cohortId,
    organizationId,
  });

  if (!cohort) {
    const error = new Error("Cohort not found");
    error.statusCode = 404;
    throw error;
  }

  if (!jobSeekerUserIds.length) {
    return { memberCount: cohort.memberCount };
  }

  await CohortMember.deleteMany({
    cohortId: cohort._id,
    jobSeekerUserId: { $in: jobSeekerUserIds },
  });

  const newMemberCount = await CohortMember.countDocuments({
    cohortId: cohort._id,
  });

  cohort.memberCount = newMemberCount;
  await cohort.save();

  return { memberCount: newMemberCount };
}
