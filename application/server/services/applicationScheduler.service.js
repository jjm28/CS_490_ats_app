// services/applicationScheduler.service.js
import mongoose from "mongoose";
import Jobs from "../models/jobs.js";
import { getDb } from "../db/connection.js";
import { getProfileByUserId } from "./profile.js";
import { updateJobStatus } from "./jobs.service.js";
import { sendNotificationEmail } from "./emailService.js";
import {
  upsertScheduleEvent,
  deleteScheduleEvent,
  computeScheduleColor,
} from "./googleCalendar.service.js";
import ApplicationSchedule from "../models/applicationSchedule.js";

const COLL = "application_schedules";
const SETTINGS_COLL = "application_scheduler_settings";

function mustBeValidObjectId(id, label) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label} format`);
  }
}

function parseISODate(value, label) {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) throw new Error(`Invalid ${label}`);
  return d;
}

function nowUtc() {
  return new Date();
}

function normalizeEmail(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  if (!ok) throw new Error("Notification email looks invalid.");
  return s;
}

async function ensureSettingsIndexes(db) {
  const c = db.collection(SETTINGS_COLL);
  await c.createIndex({ userId: 1 }, { unique: true });
}

async function getSettings(db, userId) {
  return db.collection(SETTINGS_COLL).findOne({ userId });
}

async function upsertSettings(db, userId, patch) {
  const now = new Date();
  await db.collection(SETTINGS_COLL).updateOne(
    { userId },
    { $set: { ...patch, userId, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );
}

async function resolveDefaultNotificationEmail(db, userId) {
  const s = await getSettings(db, userId);
  if (s?.defaultNotificationEmail) return s.defaultNotificationEmail;

  const profile = await getProfileByUserId(userId);
  const candidate =
    profile?.email ||
    profile?.user?.email ||
    profile?.contactEmail ||
    profile?.accountEmail ||
    "";

  return candidate ? normalizeEmail(candidate) : "";
}

function buildDefaultReminders(deadlineAt) {
  const offsetsMin = [1440, 180, 60];
  return offsetsMin
    .map((m) => {
      const remindAt = new Date(deadlineAt.getTime() - m * 60000);
      return { kind: "deadline", offsetMinutes: m, remindAt, sentAt: null };
    })
    .filter((r) => r.remindAt > new Date());
}

async function ensureIndexes(db) {
  const c = db.collection(COLL);
  await c.createIndex({ userId: 1, scheduledAt: -1 });
  await c.createIndex({ status: 1, scheduledAt: 1 });
  await c.createIndex({ status: 1, "reminders.remindAt": 1 });
  await c.createIndex({ deadlineAt: 1, status: 1 });
}

async function createSchedule({ userId, payload }) {
  const { jobId, scheduledAt, deadlineAt, notificationEmail, timezone } = payload || {};
  if (!jobId || !scheduledAt) throw new Error("jobId and scheduledAt are required.");

  const db = getDb();
  await ensureIndexes(db);
  await ensureSettingsIndexes(db);

  // FIX: COLL (COLLECTION was undefined)
  const c = db.collection(COLL);

  const job = await Jobs.findOne({ _id: jobId, userId }).lean();
  if (!job) throw new Error("Job not found or access denied.");

  const jobStatusRaw = job.status || job.applicationStatus || "";
  const jobStatus = String(jobStatusRaw).toLowerCase();

  if (jobStatus && jobStatus !== "interested") {
    throw new Error(
      `This job is currently marked as "${jobStatusRaw}". Only "interested" jobs can be scheduled.`
    );
  }

  const existing = await c.findOne({ userId, jobId, status: "scheduled" });
  if (existing) {
    throw new Error("A schedule already exists for this job. Please reschedule the existing item.");
  }

  const scheduledDate = parseISODate(scheduledAt, "scheduledAt");

  const jobDeadlineRaw = job.applicationDeadline || job.deadline || job.deadlineAt || null;
  const deadlineDate =
    deadlineAt
      ? parseISODate(deadlineAt, "deadlineAt")
      : jobDeadlineRaw
      ? new Date(jobDeadlineRaw)
      : null;

  let targetEmail = "";
  if (notificationEmail && String(notificationEmail).trim()) {
    targetEmail = normalizeEmail(notificationEmail);
    await upsertSettings(db, userId, { defaultNotificationEmail: targetEmail });
  } else {
    targetEmail = await resolveDefaultNotificationEmail(db, userId);
    if (targetEmail) {
      await upsertSettings(db, userId, { defaultNotificationEmail: targetEmail });
    }
  }

  if (!targetEmail) {
    throw new Error("No notification email is available. Please enter one and try again.");
  }

  const tz = timezone || "America/New_York";

  // FIX: buildDefaultReminders exists; buildDeadlineReminders did not
  const reminders = deadlineDate ? buildDefaultReminders(deadlineDate) : [];

  const now = new Date();
  const scheduleDoc = {
    userId,
    jobId,
    scheduledAt: scheduledDate,              // Date (serializes to ISO in JSON)
    deadlineAt: deadlineDate || null,        // Date|null
    timezone: tz,

    notificationEmail: targetEmail,
    reminders,

    status: "scheduled",
    createdAt: now,
    updatedAt: now,
    lastProcessedAt: null,
    notes: [],
    googleCalendarEventId: null,
  };

  // FIX: use imported upsertScheduleEvent (createOrUpdateGoogleCalendarEvent did not exist)
  try {
    const eventId = await upsertScheduleEvent({ schedule: scheduleDoc, job });
    if (eventId) scheduleDoc.googleCalendarEventId = eventId;
  } catch {
    // best-effort
  }

  const ins = await c.insertOne(scheduleDoc);
  scheduleDoc._id = ins.insertedId.toString();

  // Optional confirmation email (best-effort)
  try {
    await sendNotificationEmail({
      to: targetEmail,
      subject: `Application scheduled: ${job.jobTitle || job.title || "Job"}`,
      text:
        `Scheduled submission: ${scheduledDate.toLocaleString()}\n` +
        (deadlineDate ? `Deadline: ${deadlineDate.toLocaleString()}\n` : "") +
        `Timezone: ${tz}\n`,
    });
  } catch {
    // ignore
  }

  return scheduleDoc;
}

export async function listSchedules({ userId, status, from, to }) {
  const db = getDb();
  const c = db.collection(COLL);

  const q = { userId };
  if (status) q.status = status;

  if (from || to) {
    q.scheduledAt = {};
    if (from) q.scheduledAt.$gte = new Date(from);
    if (to) q.scheduledAt.$lte = new Date(to);
  }

  const items = await c.find(q).sort({ scheduledAt: -1 }).toArray();
  return {
    items: (items || []).map((s) => ({ ...s, _id: String(s._id) })),
  };
}

export async function rescheduleSchedule({ userId, scheduleId, scheduledAt, timezone }) {
  const db = getDb();
  const c = db.collection(COLL);

  mustBeValidObjectId(scheduleId, "scheduleId");
  const newTime = parseISODate(scheduledAt, "scheduledAt");

  const schedule = await c.findOne({ _id: new mongoose.Types.ObjectId(scheduleId), userId });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "scheduled") throw new Error("Only scheduled items can be rescheduled");

  if (schedule.deadlineAt && newTime.getTime() > new Date(schedule.deadlineAt).getTime()) {
    throw new Error("Scheduled time must be on/before the deadline");
  }

  const set = { scheduledAt: newTime, updatedAt: nowUtc() };
  if (timezone) set.timezone = timezone;

  await c.updateOne(
    { _id: schedule._id },
    {
      $set: set,
      $push: { audit: { at: nowUtc(), action: "rescheduled", meta: { scheduledAt: newTime, timezone } } },
    }
  );

  const updated = await c.findOne({ _id: schedule._id });
  const job = await Jobs.findOne({ _id: updated.jobId, userId }).lean();

  try {
    await upsertScheduleEvent({ schedule: updated, job });
  } catch {}

  return { ...updated, _id: String(updated._id) };
}

async function markScheduleSubmitted({ schedule, source }) {
  const db = getDb();
  const c = db.collection(COLL);

  const submittedAt = nowUtc();

  if (schedule.deadlineAt && submittedAt.getTime() > new Date(schedule.deadlineAt).getTime()) {
    await c.updateOne(
      { _id: schedule._id },
      {
        $set: { status: "expired", updatedAt: submittedAt },
        $push: { audit: { at: submittedAt, action: "expired", meta: { reason: "past-deadline-on-submit" } } },
      }
    );
    return { ok: false, reason: "expired" };
  }

  await updateJobStatus({
    userId: schedule.userId,
    id: schedule.jobId,
    status: "applied",
    note: `Scheduled submission (${source})`,
  });

  await c.updateOne(
    { _id: schedule._id },
    {
      $set: { status: "submitted", submittedAt, updatedAt: submittedAt },
      $push: { audit: { at: submittedAt, action: "submitted", meta: { source } } },
    }
  );

  return { ok: true };
}

export async function submitScheduleNow({ userId, scheduleId, source }) {
  const db = getDb();
  const c = db.collection(COLL);

  mustBeValidObjectId(scheduleId, "scheduleId");

  const schedule = await c.findOne({ _id: new mongoose.Types.ObjectId(scheduleId), userId });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "scheduled") throw new Error("Only scheduled items can be submitted");

  const job = await Jobs.findOne({ _id: schedule.jobId, userId }).lean();
  const result = await markScheduleSubmitted({ schedule, source });

  try {
    if (result.ok) {
      await sendNotificationEmail({
        to: schedule.notificationEmail,
        subject: `Application submitted (scheduled): ${job?.jobTitle || "Job"}`,
        text: `Your scheduled submission was recorded as submitted at ${new Date().toLocaleString()}.`,
      });
    } else {
      await sendNotificationEmail({
        to: schedule.notificationEmail,
        subject: `Missed deadline: ${job?.jobTitle || "Job"}`,
        text: `This scheduled submission was not completed before the deadline and was marked expired.`,
      });
    }
  } catch {}

  try {
    const updated = await c.findOne({ _id: schedule._id });
    await upsertScheduleEvent({ schedule: updated, job });
  } catch {}

  const out = await c.findOne({ _id: schedule._id });
  return { ...out, _id: String(out._id) };
}

export async function cancelSchedule({ userId, scheduleId }) {
  const db = getDb();
  const c = db.collection(COLL);

  mustBeValidObjectId(scheduleId, "scheduleId");

  const schedule = await c.findOne({ _id: new mongoose.Types.ObjectId(scheduleId), userId });
  if (!schedule) throw new Error("Schedule not found");
  if (schedule.status !== "scheduled") throw new Error("Only scheduled items can be cancelled");

  await c.updateOne(
    { _id: schedule._id },
    { $set: { status: "cancelled", updatedAt: nowUtc() }, $push: { audit: { at: nowUtc(), action: "cancelled" } } }
  );

  try {
    await deleteScheduleEvent({ schedule });
  } catch {}

  return { ok: true };
}

// Cron helpers unchanged…

async function getTimingStats(userId) {
  const uid =
    typeof userId === "string"
      ? userId
      : String(userId?.userId || userId || "").trim();

  const db = getDb();
  const c = db.collection(COLL);

  // These represent "applications we submitted"
  const submittedSchedules = await c
    .find({ userId: uid, status: "submitted" })
    .project({
      _id: 1,
      jobId: 1,
      submittedAt: 1,
      scheduledAt: 1,
      updatedAt: 1,
      deadlineAt: 1,
      timezone: 1,
    })
    .toArray();

  const totalApplications = submittedSchedules.length;

  // Stable shape for UI
  if (!totalApplications) {
    return {
      totalApplications: 0,
      avgDaysEarly: 0,
      bestTimeWindow: "—",
      responseSuccessRate: 0,
      responseByWindow: {},
    };
  }

  // Fetch current job status for referenced jobs (scoped to this user)
  const jobIds = submittedSchedules.map((s) => s.jobId).filter(Boolean);
  const jobs = await Jobs.find({ _id: { $in: jobIds }, userId: uid })
    .select("_id status stage applicationStatus jobTitle title company companyName")
    .lean();

  const jobsById = new Map(jobs.map((j) => [String(j._id), j]));

  const normalizeStage = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  const isSuccessfulStage = (job) => {
    const st = normalizeStage(job?.status || job?.stage || job?.applicationStatus);
    // per spec: phone screen, interview, offer
    return st === "phonescreen" || st === "interview" || st === "offer";
  };

  const hourInTz = (date, tz) => {
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz || "UTC",
        hour: "2-digit",
        hour12: false,
      });
      const h = dtf.formatToParts(date).find((p) => p.type === "hour")?.value;
      const n = h ? Number(h) : NaN;
      return Number.isFinite(n) ? n : date.getUTCHours();
    } catch {
      return date.getUTCHours();
    }
  };

  const windowLabelFromHour = (hour24) => {
    if (hour24 >= 5 && hour24 < 12) return "Morning (5am–12pm)";
    if (hour24 >= 12 && hour24 < 17) return "Afternoon (12pm–5pm)";
    if (hour24 >= 17 && hour24 < 21) return "Evening (5pm–9pm)";
    return "Night (9pm–5am)";
  };

  let successfulCount = 0;

  // avgDaysEarly = avg(deadlineAt - submittedAt) in days
  let daysEarlySum = 0;
  let daysEarlyN = 0;

  // window -> { total, successful }
  const byWindow = new Map();

  for (const s of submittedSchedules) {
    const job = jobsById.get(String(s.jobId));
    const successful = isSuccessfulStage(job);
    if (successful) successfulCount++;

    // submittedAt fallback (older docs)
    const submittedAtRaw = s.submittedAt || s.updatedAt || s.scheduledAt || null;
    const submittedAt = submittedAtRaw ? new Date(submittedAtRaw) : null;

    if (s.deadlineAt && submittedAt && !Number.isNaN(submittedAt.getTime())) {
      const deadlineAt = new Date(s.deadlineAt);
      if (!Number.isNaN(deadlineAt.getTime())) {
        const diffDays =
          (deadlineAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          daysEarlySum += diffDays;
          daysEarlyN += 1;
        }
      }
    }

    if (submittedAt && !Number.isNaN(submittedAt.getTime())) {
      const hour = hourInTz(submittedAt, s.timezone);
      const label = windowLabelFromHour(hour);

      const cur = byWindow.get(label) || { total: 0, successful: 0 };
      cur.total += 1;
      if (successful) cur.successful += 1;
      byWindow.set(label, cur);
    }
  }

  const responseByWindow = {};
  let bestTimeWindow = "—";
  let bestRate = -1;
  let bestTotal = -1;

  for (const [label, { total, successful }] of byWindow.entries()) {
    const successRate = total ? (successful / total) * 100 : 0;

    responseByWindow[label] = { total, successful, successRate };

    if (total > 0) {
      if (successRate > bestRate || (successRate === bestRate && total > bestTotal)) {
        bestRate = successRate;
        bestTotal = total;
        bestTimeWindow = label;
      }
    }
  }

  const avgDaysEarly = daysEarlyN ? daysEarlySum / daysEarlyN : 0;
  const responseSuccessRate = totalApplications
    ? (successfulCount / totalApplications) * 100
    : 0;

  return {
    totalApplications,
    avgDaysEarly,
    bestTimeWindow,
    responseSuccessRate,
    responseByWindow,
  };
}


export function getBestPractices() {
  return {
    items: [
      "Prefer weekday mornings/early afternoons when recruiters are active.",
      "Avoid weekends and late evenings for time-sensitive submissions.",
      "Submit 24–72 hours before the deadline when possible (buffer for issues).",
      "Batch submissions at consistent times so you can measure what works for you.",
    ],
  };
}

// Route-compatible wrappers (keep your existing external API)
export async function createApplicationSchedule({ userId, payload }) {
  return createSchedule({ userId, payload });
}

export async function listApplicationSchedules({ userId, query }) {
  const uid =
    typeof userId === "string"
      ? userId
      : String(userId?.userId || userId || "");

  if (!uid) throw new Error("Missing userId");

  // ✅ Ensure "scheduled" items past deadline become "expired" (so they persist + count correctly)
  const db = getDb();
  const c = db.collection(COLL);
  const now = new Date();
  const nowIso = now.toISOString();

  await c.updateMany(
    {
      userId: uid,
      status: "scheduled",
      deadlineAt: { $ne: null },
      $or: [
        { deadlineAt: { $type: "date", $lte: now } },
        { deadlineAt: { $type: "string", $lte: nowIso } },
      ],
    },
    {
      $set: {
        status: "expired",
        expiredAt: now,
        updatedAt: now,
        lastProcessedAt: now,
      },
      $push: {
        audit: {
          at: now,
          action: "expired",
          meta: { reason: "past-deadline-on-list" },
        },
      },
    }
  );

  // ✅ Always list from the same collection your create/cancel/reschedule writes to
  const { items = [] } = await listSchedules({
    userId: uid,
    status: query?.status,
  });

  // ✅ Enrich schedules with job metadata so the UI can display Company + Title reliably
  const jobIds = Array.from(
    new Set(items.map((s) => String(s.jobId || "")).filter(Boolean))
  );

  let jobsById = new Map();
  if (jobIds.length) {
    const jobs = await Jobs.find({ _id: { $in: jobIds }, userId: uid })
      .select("_id jobTitle title company companyName status applicationDeadline deadline")
      .lean();

    jobsById = new Map(jobs.map((j) => [String(j._id), j]));
  }

  return {
    items: items.map((s) => {
      const j = jobsById.get(String(s.jobId));
      return {
        ...s,
        job: j
          ? {
              _id: String(j._id),
              jobTitle: j.jobTitle || j.title || "",
              title: j.title || "",
              company: j.company || j.companyName || "",
              companyName: j.companyName || "",
              status: j.status || "",
              applicationDeadline: j.applicationDeadline || j.deadline || null,
            }
          : null,
      };
    }),
  };
}

export async function rescheduleApplication({ userId, scheduleId, payload }) {
  return rescheduleSchedule({
    userId,
    scheduleId,
    scheduledAt: payload?.scheduledAt,
    timezone: payload?.timezone,
  });
}

export async function rescheduleApplicationSchedule({ userId, scheduleId, payload }) {
  return rescheduleApplication({ userId, scheduleId, payload });
}

export async function submitScheduledApplicationNow({ userId, scheduleId }) {
  return submitScheduleNow({ userId, scheduleId, source: "manual" });
}

export async function cancelApplicationSchedule({ userId, scheduleId }) {
  return cancelSchedule({ userId, scheduleId });
}

export async function getSubmissionTimeStats(userId) {
  return getTimingStats(userId);
}

export async function listEligibleJobsForScheduler(input) {
  // accept: { userId }, userId string, or weird nested shapes
  const raw =
    typeof input === "string"
      ? input
      : input?.userId?.userId ?? input?.userId ?? input;

  const userId =
    raw && typeof raw === "object" ? raw.userId ?? raw._id ?? raw.id : raw;

  const uid = userId ? String(userId) : "";
  if (!uid) throw new Error("Missing userId");

  const db = getDb();

  // exclude already scheduled jobs
  const scheduled = await db
    .collection("application_schedules")
    .find({ userId: uid, status: "scheduled" })
    .project({ jobId: 1 })
    .toArray();

  const scheduledIds = new Set(scheduled.map((s) => String(s.jobId)));

  // pull "interested" jobs for THIS user
  const jobs = await Jobs.find({
    userId: uid,
    archived: { $ne: true },
    $or: [
      { status: { $regex: /interested/i } },
      { applicationStatus: { $regex: /interested/i } },
    ],
  })
    .select({
      _id: 1,
      jobTitle: 1,
      title: 1,
      company: 1,
      companyName: 1,
      status: 1,
      applicationStatus: 1,
      applicationDeadline: 1,
      deadline: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .lean();

  const items = jobs
    .filter((j) => !scheduledIds.has(String(j._id)))
    .map((j) => ({
      _id: String(j._id),
      jobTitle: j.jobTitle || j.title || "Untitled Job",
      title: j.title,
      company: j.company || j.companyName || "Unknown Company",
      companyName: j.companyName,
      status: j.status || j.applicationStatus || "interested",
      applicationDeadline: j.applicationDeadline || j.deadline || null,
      deadline: j.deadline || j.applicationDeadline || null,
    }));

  return { items };
}




export async function getDefaultNotificationEmail({ userId }) {
  const db = getDb();
  await ensureSettingsIndexes(db);
  const email = await resolveDefaultNotificationEmail(db, userId);
  return { email: email || null };
}

export async function setDefaultNotificationEmail({ userId, payload }) {
  const db = getDb();
  await ensureSettingsIndexes(db);

  const email = normalizeEmail(payload?.email);
  await upsertSettings(db, userId, { defaultNotificationEmail: email });
  return { email };
}

export async function processDueReminders() {
  const db = getDb();
  const c = db.collection("application_schedules");
  const now = new Date();

  // Find any reminder not yet sent and due now or earlier
  const due = await c
    .find({
      "reminders.remindAt": { $lte: now },
      "reminders.sentAt": null,
      status: "scheduled",
    })
    .limit(50)
    .toArray();

  for (const s of due) {
    for (const r of s.reminders || []) {
      if (!r.sentAt && new Date(r.remindAt) <= now) {
        try {
          await sendNotificationEmail({
            to: s.notificationEmail,
            subject: "Application reminder",
            text: `Reminder: your application for job ${s.jobId} is due soon (${s.deadlineAt || "no deadline"}).`,
          });
          r.sentAt = now;
        } catch {}
      }
    }
    await c.updateOne({ _id: s._id }, { $set: { reminders: s.reminders } });
  }

  return { processed: due.length };
}

export async function processDueSubmissions() {
  
  return { ok: true };
}

export async function processExpiredSchedules({ batchSize = 200 } = {}) {
  const db = getDb();
  const c = db.collection(COLL);
  const now = nowUtc();
  const nowIso = now.toISOString();

  let processed = 0;

  // Query catches both Date and ISO-string deadlines
  const baseQuery = {
    status: "scheduled",
    deadlineAt: { $ne: null },
    $or: [
      { deadlineAt: { $type: "date", $lte: now } },
      { deadlineAt: { $type: "string", $lte: nowIso } }, // ISO lexical compare works
    ],
  };

  while (true) {
    // Pull a batch
    const candidates = await c
      .find(baseQuery)
      .project({
        _id: 1,
        userId: 1,
        jobId: 1,
        deadlineAt: 1,
        scheduledAt: 1,
        notificationEmail: 1,
        googleCalendarEventId: 1,
      })
      .limit(batchSize)
      .toArray();

    if (!candidates.length) break;

    for (const s of candidates) {
      // Defensive parse (in case deadlineAt has unexpected shape)
      const deadline = new Date(s.deadlineAt);
      if (Number.isNaN(deadline.getTime())) {
        // If it's malformed, skip it (avoid expiring incorrectly)
        continue;
      }
      if (deadline.getTime() > now.getTime()) {
        // If lexical match was weird (non-ISO string), don't expire incorrectly
        continue;
      }

      // Idempotent update: only expire if still scheduled
      const updated = await c.findOneAndUpdate(
        { _id: s._id, status: "scheduled" },
        {
          $set: {
            status: "expired",
            expiredAt: now,
            updatedAt: now,
            lastProcessedAt: now,
          },
          $push: {
            audit: {
              at: now,
              action: "expired",
              meta: { deadlineAt: s.deadlineAt },
            },
          },
          $unset: { processingAt: "" }, // cleanup if it exists
        },
        { returnDocument: "after" }
      );

      if (!updated?.value) continue; // someone else processed it

      processed += 1;

      // Best-effort: update Calendar event to reflect expired status
      try {
        const job = await Jobs.findOne({ _id: s.jobId, userId: s.userId }).lean();
        await upsertScheduleEvent({ schedule: updated.value, job });
      } catch (_) {}

      // Best-effort: notify user (optional; comment out if you don’t want emails)
      try {
        const job = await Jobs.findOne({ _id: s.jobId, userId: s.userId }).lean();
        const title = job?.jobTitle || job?.title || "Job";
        const company = job?.company || job?.companyName || "";
        await sendNotificationEmail({
          to: s.notificationEmail,
          subject: `Missed deadline: ${title}${company ? ` (${company})` : ""}`,
          text:
            `This scheduled application was marked expired because the deadline passed.\n` +
            `Deadline: ${deadline.toLocaleString()}\n` +
            `Scheduled time: ${s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "N/A"}\n`,
        });
      } catch (_) {}
    }
  }

  return { processed };
}