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