// services/handshake.service.js
import { parse } from "csv-parse/sync";
import User from "../models/user.js";
import Profile from "../models/profile.js";
import Cohort from "../models/Cohort/Cohort.js";
import CohortMember from "../models/Cohort/CohortMember.js";
import Job from "../models/jobs.js";

/**
 * Safely get a field from a row with a few possible header variants.
 */
function getField(row, keys, defaultValue = "") {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return defaultValue;
}

/**
 * Import students from a Handshake-style students CSV.
 * - organizationId: org that owns these students
 * - cohortId: optional cohort to add them to
 * - csvBuffer: raw file buffer
 */
export async function importStudentsFromHandshakeCsv({
  organizationId,
  cohortId = null,
  csvBuffer,
}) {
  if (!organizationId) {
    throw new Error("organizationId is required for importing students");
  }

  // Parse CSV (UTF-8, headers in first row)
  const rows = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Optional: pre-validate cohort
  let cohort = null;
  if (cohortId) {
    cohort = await Cohort.findOne({ _id: cohortId, organizationId }).lean();
    if (!cohort) {
      const err = new Error("Cohort not found for this organization");
      err.statusCode = 404;
      throw err;
    }
  }

  for (const row of rows) {
    // Handshake-style field names
    const email = getField(row, ["email_address", "email"]);
    if (!email) {
      skippedCount++;
      continue;
    }

    const firstName = getField(row, ["preferred_name", "first_name"]);
    const lastName = getField(row, ["last_name"]);
    const schoolYearName = getField(row, ["school_year_name"]);
    const majors = getField(row, ["primary_education:major_names"]);
    const mobileNumber = getField(row, ["mobile_number"]);

    const fullName = (firstName && lastName)
      ? `${firstName} ${lastName}`.trim()
      : firstName || email;

    // Find existing user by email
    let user = await User.findOne({ email }).exec();

    if (!user) {
      // Create new job_seeker user under this org
      user = new User({
        email,
        // NOTE: adjust based on your schema:
        // If passwordHash is required, you can put a random string placeholder
        // and then later handle login via magic link / reset.
        passwordHash: "", // or some placeholder if required
        firstName: firstName || "",
        lastName: lastName || "",
        role: "job_seeker",
        organizationId,
        isDeleted: false,
      });
      await user.save();
      createdCount++;
    } else {
      // Update existing user if needed
      let changed = false;

      if (user.isDeleted) {
        user.isDeleted = false;
        changed = true;
      }

      if (user.role !== "job_seeker") {
        user.role = "job_seeker";
        changed = true;
      }

      if (!user.organizationId) {
        user.organizationId = organizationId;
        changed = true;
      }

      if (firstName && user.firstName !== firstName) {
        user.firstName = firstName;
        changed = true;
      }
      if (lastName && user.lastName !== lastName) {
        user.lastName = lastName;
        changed = true;
      }

      if (changed) {
        await user.save();
        updatedCount++;
      } else {
        // No changes to user, but we might still update profile / cohort below
        updatedCount++;
      }
    }

    // Upsert profile
    let profile = await Profile.findOne({ userId: user._id.toString() }).exec();
    if (!profile) {
      profile = new Profile({
        userId: user._id.toString(),
        fullName,
        email,
      });
    } else {
      if (fullName && profile.fullName !== fullName) {
        profile.fullName = fullName;
      }
      if (!profile.email) {
        profile.email = email;
      }
    }

    // Map Handshake fields into your ATS profile shape
    if (schoolYearName) {
      profile.experienceLevel = schoolYearName; // simple mapping
    }
    if (majors) {
      // crude mapping: first major becomes industry
      const firstMajor = majors.split(";")[0].trim();
      if (firstMajor) {
        profile.industry = firstMajor;
      }
    }
    if (mobileNumber && !profile.phone) {
      profile.phone = mobileNumber;
    }

    await profile.save();

    // Add to cohort if requested
    if (cohort) {
      const jobSeekerUserId = user._id.toString();
      try {
        await CohortMember.updateOne(
          { cohortId: cohort._id, jobSeekerUserId },
          {
            $setOnInsert: {
              cohortId: cohort._id,
              jobSeekerUserId,
              joinedAt: new Date(),
              source: "integration",
            },
          },
          { upsert: true }
        ).exec();
      } catch (e) {
        // ignore duplicate errors
      }
    }
  }

  // If cohort was used, refresh memberCount
  if (cohort) {
    const memberCount = await CohortMember.countDocuments({
      cohortId: cohort._id,
    }).exec();
    await Cohort.updateOne(
      { _id: cohort._id },
      { $set: { memberCount } }
    ).exec();
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    totalRows: rows.length,
  };
}

/**
 * Import jobs from a Handshake-flavored jobs CSV.
 * - organizationId: org context for analytics later
 * - ownerUserId: which user "owns" these Job records (OrgAdmin)
 * - csvBuffer: raw file buffer
 */
export async function importJobsFromHandshakeCsv({
  organizationId,
  ownerUserId,
  csvBuffer,
}) {
  if (!organizationId) {
    throw new Error("organizationId is required for importing jobs");
  }
  if (!ownerUserId) {
    throw new Error("ownerUserId is required for importing jobs");
  }

  const rows = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const jobTitle = getField(row, ["job_title", "title"]);
    const company = getField(row, ["employer", "company"]);
    if (!jobTitle || !company) {
      skippedCount++;
      continue;
    }

    const location = getField(row, ["location"]);
    const jobPostingUrl = getField(row, ["url", "job_url"]);
    const employmentType = getField(row, ["employment_type", "type"]);
    const industry = getField(row, ["industry"]);

    const job = new Job({
      userId: ownerUserId,
      jobTitle,
      company,
      location,
      jobPostingUrl,
      industry,
      type: employmentType,
      applicationSource: "Handshake",
      source: "handshake",
      status: "interested",
    });

    await job.save();
    createdCount++;
  }

  return {
    createdCount,
    skippedCount,
    totalRows: rows.length,
  };
}
