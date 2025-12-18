// services/applicationImport.service.js
import crypto from "crypto";
import mongoose from "mongoose";
import Jobs from "../models/jobs.js";
import { createJob, addApplicationHistory } from "./jobs.service.js";
import { getDb } from "../db/connection.js";

const IMPORT_EVENTS_COLL = "application_import_events";
const JOB_FINGERPRINTS_COLL = "job_import_fingerprints";
const JOB_PLATFORM_LINKS_COLL = "job_platform_links";
const SCHEDULES_COLL = "application_schedules";

function now() {
  return new Date();
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function normForKey(v) {
  return safeStr(v)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sha1(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex");
}

function computeJobFingerprint({ jobTitle, company, location }) {
  const t = normForKey(jobTitle);
  const c = normForKey(company);
  const l = normForKey(location);
  return sha1(`${t}|${c}|${l}`);
}

function computeEventFingerprint({
  userId,
  platform,
  sourceType,
  messageId,
  externalId,
  jobFingerprint,
  appliedAt,
}) {
  const base =
    externalId ||
    messageId ||
    `${jobFingerprint}|${platform}|${sourceType}|${
      appliedAt ? new Date(appliedAt).toISOString().slice(0, 10) : "na"
    }`;
  return sha1(`${userId}|${platform}|${sourceType}|${base}`);
}

function parseDateMaybe(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstMatch(regex, text) {
  const m = text.match(regex);
  return m?.[1] ? String(m[1]).trim() : "";
}

function mapPlatformForEnum(platform) {
  const p = String(platform || "").toLowerCase();
  if (p === "linkedin") return "LinkedIn";
  if (p === "indeed") return "Indeed";
  if (p === "glassdoor") return "Glassdoor";
  if (p === "company" || p === "company_site" || p === "company site") return "Company Site";
  return "Other";
}

function isEnumValidationError(err) {
  const msg = err?.message || "";
  return msg.includes("is not a valid enum value for path `applicationMethod`") ||
         msg.includes("is not a valid enum value for path `applicationSource`");
}

/**
 * UC-125 Extraction:
 * Covers common platform email formats with best-effort heuristics.
 * Also supports callers passing jobTitle/company/location directly.
 */
export function extractJobDetailsFromEmail({ subject, from, bodyText }) {
  const s = safeStr(subject);
  const f = safeStr(from).toLowerCase();
  const b = safeStr(bodyText);

  let platform = "unknown";
  if (f.includes("linkedin") || s.toLowerCase().includes("linkedin")) platform = "linkedin";
  else if (f.includes("indeed") || s.toLowerCase().includes("indeed")) platform = "indeed";
  else if (f.includes("glassdoor") || s.toLowerCase().includes("glassdoor")) platform = "glassdoor";

  // Location lines (very common)
  let location =
    firstMatch(/^\s*location\s*:\s*(.+?)\s*$/im, b) ||
    firstMatch(/^\s*job location\s*:\s*(.+?)\s*$/im, b) ||
    "";

  // Pattern: "Your application was sent to Acme Corp for Software Engineer"
  let company = "";
  let jobTitle = "";

  const sentToFor = b.match(
    /your application was sent to\s+(.+?)\s+for\s+(.+?)(?:\r?\n|$)/i
  );
  if (sentToFor) {
    company = company || String(sentToFor[1]).trim();
    jobTitle = jobTitle || String(sentToFor[2]).trim();
  }

  // Pattern: "You applied to <company> for <title>"
  const appliedToFor = b.match(
    /you applied to\s+(.+?)\s+for\s+(.+?)(?:\r?\n|$)/i
  );
  if (appliedToFor) {
    company = company || String(appliedToFor[1]).trim();
    jobTitle = jobTitle || String(appliedToFor[2]).trim();
  }

  // Pattern: "Applied for: <title>" / "Role: <title>"
  jobTitle =
    jobTitle ||
    firstMatch(/^\s*applied for\s*:\s*(.+?)\s*$/im, b) ||
    firstMatch(/^\s*application for\s*:\s*(.+?)\s*$/im, b) ||
    firstMatch(/^\s*role\s*:\s*(.+?)\s*$/im, b);

  // Pattern: "Company: <company>"
  company =
    company ||
    firstMatch(/^\s*company\s*:\s*(.+?)\s*$/im, b);

  // Subject fallbacks:
  // "You applied to Software Engineer at Acme Corp"
  if (!company || !jobTitle) {
    const subjAt = s.match(/applied to\s+(.+?)\s+at\s+(.+?)$/i);
    if (subjAt) {
      jobTitle = jobTitle || String(subjAt[1]).trim();
      company = company || String(subjAt[2]).trim();
    }
  }

  // Subject fallback:
  // "Your application was sent to Acme Corp" + body contains "... for Software Engineer"
  if (!company) {
    const subjTo = s.match(/application .* sent to\s+(.+?)$/i);
    if (subjTo) company = company || String(subjTo[1]).trim();
  }
  if (company && !jobTitle) {
    const forLine =
      firstMatch(/^\s*for\s+(.+?)\s*$/im, b) ||
      firstMatch(/for\s+(.+?)(?:\r?\n|$)/i, b);
    if (forLine && forLine.length <= 120) jobTitle = jobTitle || forLine;
  }

  // Final cleanup
  company = company || null;
  jobTitle = jobTitle || null;
  location = location || null;

  return { platform, jobTitle, company, location };
}

async function ensureIndexes(db) {
  await db.collection(IMPORT_EVENTS_COLL).createIndex({ userId: 1, eventFingerprint: 1 }, { unique: true });
  await db.collection(IMPORT_EVENTS_COLL).createIndex({ userId: 1, jobId: 1 });
  await db.collection(IMPORT_EVENTS_COLL).createIndex({ userId: 1, createdAt: -1 });

  await db.collection(JOB_FINGERPRINTS_COLL).createIndex({ userId: 1, jobFingerprint: 1 }, { unique: true });
  await db.collection(JOB_PLATFORM_LINKS_COLL).createIndex({ userId: 1, jobId: 1 }, { unique: true });

  await db.collection(SCHEDULES_COLL).createIndex({ userId: 1, scheduledAt: -1 });
  await db.collection(SCHEDULES_COLL).createIndex({ userId: 1, jobId: 1, status: 1 });
}

async function ensureSubmittedScheduleForAppliedJob({ db, userId, jobId, appliedAt, timezone }) {
  const c = db.collection(SCHEDULES_COLL);

  const existing = await c.findOne({ userId, jobId, status: "submitted" });
  if (existing) return { created: false, scheduleId: String(existing._id) };

  const at = appliedAt || now();
  const doc = {
    userId,
    jobId,
    scheduledAt: at,
    submittedAt: at,
    deadlineAt: null,
    timezone: timezone || "America/New_York",
    notificationEmail: "",
    reminders: [],
    status: "submitted",
    createdAt: now(),
    updatedAt: now(),
    lastProcessedAt: null,
    notes: [],
    audit: [{ at: now(), action: "imported_submitted", meta: { source: "uc125" } }],
    googleCalendarEventId: null,
  };

  const ins = await c.insertOne(doc);
  return { created: true, scheduleId: String(ins.insertedId) };
}

async function findJobByFingerprintOrLooseMatch({ userId, jobFingerprint, jobTitle, company, location }) {
  const db = getDb();

  const fp = await db.collection(JOB_FINGERPRINTS_COLL).findOne({ userId, jobFingerprint });
  if (fp?.jobId) return { jobId: String(fp.jobId), via: "fingerprint_map" };

  const titleRe = new RegExp(`^${escapeRegExp(jobTitle)}$`, "i");
  const compRe = new RegExp(`^${escapeRegExp(company)}$`, "i");

  const query = {
    userId,
    $and: [
      { $or: [{ jobTitle: titleRe }, { title: titleRe }] },
      { $or: [{ company: compRe }, { companyName: compRe }] },
    ],
  };

  if (location) {
    const locRe = new RegExp(`^${escapeRegExp(location)}$`, "i");
    query.$and.push({ $or: [{ location: locRe }, { jobLocation: locRe }] });
  }

  const job = await Jobs.findOne(query).lean();
  if (job?._id) {
    await db.collection(JOB_FINGERPRINTS_COLL).updateOne(
      { userId, jobFingerprint },
      { $set: { userId, jobFingerprint, jobId: String(job._id), updatedAt: now() }, $setOnInsert: { createdAt: now() } },
      { upsert: true }
    );
    return { jobId: String(job._id), via: "loose_job_match" };
  }

  return { jobId: null, via: "none" };
}

async function upsertJobPlatformLink({ db, userId, jobId, platform, sourceType, jobUrl, messageId, externalId, comm }) {
  await db.collection(JOB_PLATFORM_LINKS_COLL).updateOne(
    { userId, jobId },
    {
      $set: { userId, jobId, updatedAt: now() },
      $setOnInsert: { createdAt: now() },
      $addToSet: {
        platforms: {
          platform: platform || "unknown",
          sourceType: sourceType || "unknown",
          jobUrl: jobUrl || null,
          externalId: externalId || null,
          firstSeenAt: now(),
        },
      },
      ...(comm
        ? {
            $push: {
              communications: {
                platform: platform || "unknown",
                sourceType: sourceType || "unknown",
                messageId: messageId || null,
                subject: comm.subject || null,
                from: comm.from || null,
                receivedAt: comm.receivedAt || now(),
                snippet: comm.snippet || null,
                createdAt: now(),
              },
            },
          }
        : {}),
    },
    { upsert: true }
  );
}

async function setJobPostingUrlIfEmpty({ userId, jobId, jobUrl }) {
  if (!jobUrl) return;

  await Jobs.updateOne(
    {
      _id: new mongoose.Types.ObjectId(String(jobId)),
      userId,
      $or: [{ jobPostingUrl: "" }, { jobPostingUrl: { $exists: false } }],
    },
    { $set: { jobPostingUrl: jobUrl } }
  );
}

export async function importApplicationEvent({ userId, payload }) {
  const db = getDb();
  await ensureIndexes(db);

  const sourceType = safeStr(payload.sourceType || "unknown");
  const platform = safeStr(payload.platform || "unknown");

  const extracted =
    payload.extracted && typeof payload.extracted === "object"
      ? payload.extracted
      : extractJobDetailsFromEmail({
          subject: payload.emailSubject,
          from: payload.emailFrom,
          bodyText: payload.emailBodyText,
        });

  const jobTitle = safeStr(payload.jobTitle || extracted.jobTitle);
  const company = safeStr(payload.company || extracted.company);
  const location = safeStr(payload.location || extracted.location);

  if (!jobTitle || !company) {
    throw new Error(
      "Missing required fields: jobTitle and company (either provide them directly or via extracted/email)."
    );
  }

  const appliedAt = parseDateMaybe(payload.appliedAt) || now();
  const timezone = safeStr(payload.timezone || "America/New_York");
  const jobUrl = safeStr(payload.jobUrl || payload.url || payload.jobPostingUrl || "");

  const jobFingerprint = computeJobFingerprint({ jobTitle, company, location });

  const messageId = safeStr(payload.messageId || "");
  const externalId = safeStr(payload.externalId || "");
  const eventFingerprint = computeEventFingerprint({
    userId,
    platform,
    sourceType,
    messageId,
    externalId,
    jobFingerprint,
    appliedAt,
  });

  const events = db.collection(IMPORT_EVENTS_COLL);
  const existingEvent = await events.findOne({ userId, eventFingerprint });
  if (existingEvent) {
    return {
      ok: true,
      deduped: true,
      eventId: String(existingEvent._id),
      jobId: existingEvent.jobId ? String(existingEvent.jobId) : null,
      scheduleId: existingEvent.scheduleId ? String(existingEvent.scheduleId) : null,
      reason: "event_already_imported",
    };
  }

  const found = await findJobByFingerprintOrLooseMatch({ userId, jobFingerprint, jobTitle, company, location });

  let jobId = found.jobId;
  let createdJob = false;

  if (!jobId) {
    const statusHistory = [
        { status: "applied", timestamp: appliedAt, note: `Imported (${platform})` },
    ];

    const appSourceEnum = mapPlatformForEnum(platform);

    // first attempt (preferred values)
    let jobPayload = {
        jobTitle,
        company,
        location: location || "",
        status: "applied",
        offerStage: "Applied",
        source: "manual",
        applicationMethod: "Other",       // safest enum default based on your existing records
        applicationSource: appSourceEnum, // try LinkedIn/Indeed/Glassdoor title-case
        jobPostingUrl: jobUrl || "",
        statusHistory,
    };

    let created;
    try {
        created = await createJob({ userId, payload: jobPayload });
    } catch (err) {
        // if enum mapping is rejected, fallback to Other/Other
        if (isEnumValidationError(err)) {
        jobPayload = {
            ...jobPayload,
            applicationMethod: "Other",
            applicationSource: "Other",
        };
        created = await createJob({ userId, payload: jobPayload });
        } else {
        throw err;
        }
    }
    
    jobId = String(created._id);
    createdJob = true;

    await db.collection(JOB_FINGERPRINTS_COLL).updateOne(
      { userId, jobFingerprint },
      { $set: { userId, jobFingerprint, jobId, updatedAt: now() }, $setOnInsert: { createdAt: now() } },
      { upsert: true }
    );

    try {
      await addApplicationHistory({
        userId,
        id: jobId,
        action: `Imported application: applied via ${platform} (${sourceType})`,
      });
    } catch {
      // best-effort
    }
  }
  await setJobPostingUrlIfEmpty({ userId, jobId, jobUrl });

  await upsertJobPlatformLink({
    db,
    userId,
    jobId,
    platform,
    sourceType,
    jobUrl: jobUrl || null,
    messageId: messageId || null,
    externalId: externalId || null,
    comm: payload.emailSubject
      ? {
          subject: payload.emailSubject,
          from: payload.emailFrom,
          receivedAt: parseDateMaybe(payload.emailReceivedAt) || now(),
          snippet: payload.emailSnippet || null,
        }
      : null,
  });

  const scheduleRes = await ensureSubmittedScheduleForAppliedJob({
    db,
    userId,
    jobId,
    appliedAt,
    timezone,
  });

  const eventDoc = {
    userId,
    sourceType,
    platform,
    appliedAt,
    timezone,
    jobTitle,
    company,
    location: location || null,
    jobFingerprint,
    eventFingerprint,
    jobId,
    scheduleId: scheduleRes?.scheduleId || null,
    messageId: messageId || null,
    externalId: externalId || null,
    raw: {
      jobUrl: jobUrl || null,
      emailFrom: payload.emailFrom || null,
      emailSubject: payload.emailSubject || null,
    },
    createdAt: now(),
  };

  const ins = await events.insertOne(eventDoc);

  return {
    ok: true,
    deduped: false,
    createdJob,
    mergedIntoExistingJob: !createdJob,
    jobId,
    schedule: scheduleRes,
    eventId: String(ins.insertedId),
    jobMatchVia: found.via,
  };
}

export async function importApplicationEventsBulk({ userId, events }) {
  if (!Array.isArray(events) || events.length === 0) return { ok: true, results: [] };
  const results = [];
  for (const ev of events) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await importApplicationEvent({ userId, payload: ev });
      results.push({ ok: true, ...r });
    } catch (e) {
      results.push({ ok: false, error: e?.message || "Import failed" });
    }
  }
  return { ok: true, results };
}

export async function getPlatformInfoForJob({ userId, jobId }) {
  const db = getDb();
  await ensureIndexes(db);
  const doc = await db.collection(JOB_PLATFORM_LINKS_COLL).findOne({ userId, jobId: String(jobId) });
  return { ok: true, jobId: String(jobId), platformInfo: doc || null };
}
