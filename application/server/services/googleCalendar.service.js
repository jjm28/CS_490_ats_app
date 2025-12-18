// server/services/googleCalendar.service.js
import { google } from "googleapis";
import path from "path";
import fs from "fs";
const calendar = google.calendar("v3");

// ---- Configuration ----
const CALENDAR_ID = process.env.GCAL_CALENDAR_ID || "primary"; // Prefer sharing a specific calendar with the service account
const TIME_ZONE = process.env.GCAL_TIME_ZONE || "America/New_York";
const KEYFILE_FROM_ENV = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const KEYFILE_FALLBACK = "google-service-account.json";

// Memoized auth client
let _auth = null;

function getKeyfilePath() {
  // Prefer GOOGLE_APPLICATION_CREDENTIALS if set
  if (KEYFILE_FROM_ENV) return KEYFILE_FROM_ENV;
  // Otherwise resolve the local file relative to this file
  const abs = path.resolve(process.cwd(), KEYFILE_FALLBACK);
  if (!fs.existsSync(abs)) {
    // Give a helpful error (this was your ENOENT)
    throw new Error(
      `Google service account key file not found at "${abs}". ` +
      `Set GOOGLE_APPLICATION_CREDENTIALS or place ${KEYFILE_FALLBACK} in your server root.`
    );
  }
  return abs;
}

async function getAuthClient() {
  if (_auth) return _auth;
  const keyFile = getKeyfilePath();
  _auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return _auth;
}

function iso(dt) {
  return new Date(dt).toISOString();
}

// -------------------- CREATE --------------------
export async function createCalendarEvent({ title, description, location, start, end }) {
  const auth = await getAuthClient();
  const res = await calendar.events.insert({
    auth,
    calendarId: CALENDAR_ID,
    sendUpdates: "none", // or "all" if you add attendees and want emails to go out
    requestBody: {
      summary: title,
      description,
      location,
      start: { dateTime: iso(start), timeZone: TIME_ZONE },
      end: { dateTime: iso(end), timeZone: TIME_ZONE },
    },
  });
  return res.data; // IMPORTANT: includes .id
}

// -------------------- UPDATE --------------------
export async function updateCalendarEvent(eventId, data) {
  const auth = await getAuthClient();
  const res = await calendar.events.patch({
    auth,
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "none",
    requestBody: {
      summary: data.title,
      description: data.description,
      location: data.location,
      start: { dateTime: iso(data.start), timeZone: TIME_ZONE },
      end: { dateTime: iso(data.end), timeZone: TIME_ZONE },
    },
  });
  return res.data; // Return updated resource (contains .id)
}

// -------------------- DELETE --------------------
export async function deleteCalendarEvent(eventId) {
  const auth = await getAuthClient();
  try {
    await calendar.events.delete({
      auth,
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: "none",
    });
  } catch (err) {
    // If the event was already removed, don't crash your flow
    if (err?.code === 404) {
      console.warn(`Calendar event ${eventId} already gone (404); continuing.`);
      return;
    }
    throw err;
  }
}

//added for applications
export async function patchCalendarEvent(eventId, patch) {
  const auth = await getAuthClient();
  const res = await calendar.events.patch({
    auth,
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "none",
    requestBody: patch,
  });
  return res.data;
}

export async function createCalendarEventWithOptions({
  title,
  description,
  location,
  start,
  end,
  colorId,
  extendedProperties,
}) {
  const auth = await getAuthClient();
  const res = await calendar.events.insert({
    auth,
    calendarId: CALENDAR_ID,
    sendUpdates: "none",
    requestBody: {
      summary: title,
      description,
      location,
      start: { dateTime: iso(start), timeZone: TIME_ZONE },
      end: { dateTime: iso(end), timeZone: TIME_ZONE },
      ...(colorId ? { colorId } : {}),
      ...(extendedProperties ? { extendedProperties } : {}),
    },
  });
  return res.data;
}

export async function updateCalendarEventWithOptions(eventId, data) {
  const auth = await getAuthClient();
  const res = await calendar.events.patch({
    auth,
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "none",
    requestBody: {
      summary: data.title,
      description: data.description,
      location: data.location,
      start: { dateTime: iso(data.start), timeZone: TIME_ZONE },
      end: { dateTime: iso(data.end), timeZone: TIME_ZONE },
      ...(data.colorId ? { colorId: data.colorId } : {}),
      ...(data.extendedProperties ? { extendedProperties: data.extendedProperties } : {}),
    },
  });
  return res.data;
}

// google event building handling
const COLOR_GREEN = String(process.env.GCAL_COLOR_GREEN || "10");
const COLOR_ORANGE = String(process.env.GCAL_COLOR_ORANGE || "6");
const COLOR_RED = String(process.env.GCAL_COLOR_RED || "11");

export function computeScheduleColor(schedule) {
  const now = new Date();

  if (schedule?.status === "submitted") return { colorId: COLOR_GREEN };
  if (schedule?.status === "expired") return { colorId: COLOR_RED };

  if (schedule?.deadlineAt) {
    const deadline = new Date(schedule.deadlineAt);
    if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) {
      return { colorId: COLOR_RED };
    }
  }

  // Default = pending/scheduled before deadline
  return { colorId: COLOR_ORANGE };
}

function buildScheduleEventBody({ schedule, job, colorId }) {
  const scheduledAt = new Date(schedule.scheduledAt);
  const endAt = new Date(scheduledAt.getTime() + 15 * 60 * 1000);

  const company = job?.company || "Company";
  const title = job?.title || "Role";
  const status = (schedule?.status || "scheduled").toUpperCase();

  const deadlineLine = schedule?.deadlineAt ? `Deadline: ${new Date(schedule.deadlineAt).toLocaleString()}` : "Deadline: (none)";
  const linkLine = job?.link ? `Link: ${job.link}` : "";

  return {
    summary: `[${status}] Apply: ${company} — ${title}`,
    description: [
      `Application Scheduler`,
      `Schedule ID: ${String(schedule._id)}`,
      `Job ID: ${String(schedule.jobId)}`,
      deadlineLine,
      linkLine,
    ].filter(Boolean).join("\n"),
    start: { dateTime: iso(scheduledAt), timeZone: TIME_ZONE },
    end: { dateTime: iso(endAt), timeZone: TIME_ZONE },
    colorId,
    extendedProperties: {
      private: {
        scheduleId: String(schedule._id),
        jobId: String(schedule.jobId),
        userId: String(schedule.userId),
        status: String(schedule.status || "scheduled"),
      },
    },
  };
}

/**
 * Creates or patches a Google Calendar event for a schedule and returns { eventId, colorId }.
 * Best-effort: caller decides whether to swallow errors.
 */
export async function upsertScheduleEvent({ schedule, job }) {
  const auth = await getAuthClient();
  const { colorId } = computeScheduleColor(schedule);
  const body = buildScheduleEventBody({ schedule, job, colorId });

  const existingEventId = schedule?.calendar?.eventId;

  if (existingEventId) {
    const res = await calendar.events.patch({
      auth,
      calendarId: CALENDAR_ID,
      eventId: existingEventId,
      sendUpdates: "none",
      requestBody: body,
    });
    return { eventId: res.data?.id || existingEventId, colorId };
  }

  const res = await calendar.events.insert({
    auth,
    calendarId: CALENDAR_ID,
    sendUpdates: "none",
    requestBody: body,
  });

  return { eventId: res.data?.id || null, colorId };
}

export async function deleteScheduleEvent({ schedule }) {
  const eventId = schedule?.calendar?.eventId;
  if (!eventId) return;
  await deleteCalendarEvent(eventId);
}