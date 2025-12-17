import { Hand } from "lucide-react";
import { handleError } from "./errorHandler";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

/** ✅ Wait for scripts to load */
function waitForGoogleScripts(): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.gapi && window.google) {
        clearInterval(check);
        console.log("✅ Google scripts loaded");
        resolve();
      } else if (attempts > 50) {
        clearInterval(check);
        reject("❌ Google scripts not detected after 5s");
      }
    }, 100);
  });
}

/** ✅ Initialize GAPI and GIS */
export async function initGapi(): Promise<void> {
  console.log("🚀 initGapi() called");

  await waitForGoogleScripts();

  await new Promise<void>((resolve, reject) => {
    try {
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          console.log("✅ GAPI client initialized");
          resolve();
        } catch (err) {
          handleError(err);
          console.error("❌ GAPI client init failed:", err);
          reject(err);
        }
      });
    } catch (err) {
      handleError(err);
      console.error("❌ Error loading GAPI:", err);
      reject(err);
    }
  });

  if (window.google && window.google.accounts?.oauth2) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) console.error("❌ Token client error:", response);
        else console.log("✅ GIS token acquired");
      },
    });
    gisInited = true;
    console.log("✅ Google Identity Services initialized");
  } else {
    console.error("❌ Google Identity Services not loaded");
  }
}

/** ✅ OAuth sign-in */
export async function signIn(): Promise<void> {
  if (!gisInited) throw new Error("GIS not initialized");
  return new Promise((resolve) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) console.error("❌ Token request failed:", resp);
      else {
        console.log("✅ User signed in to Google Calendar");
        resolve();
      }
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

/** ✅ Signed-in check */
export function isSignedIn(): boolean {
  const token = window.gapi?.client?.getToken?.();
  return !!token && !!token.access_token;
}

/** ✅ Sign-out */
export function signOut() {
  const token = window.gapi?.client?.getToken?.();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      console.log("🔒 Access token revoked");
      window.gapi.client.setToken("");
    });
  }
}

/** ✅ Create calendar event */
export async function createCalendarEvent(interview: {
  type: string;
  date: string;
  location?: string;
  notes?: string;
  jobTitle?: string;
  company?: string;
}) {
  if (!isSignedIn()) {
    console.warn("⚠️ User not signed in to Google Calendar");
    return;
  }

  const start = new Date(interview.date).toISOString();
  const end = new Date(
    new Date(interview.date).getTime() + 60 * 60 * 1000
  ).toISOString();

  const event = {
    summary: `Interview (${interview.type}) - ${interview.company || ""}`,
    description: interview.notes || "Interview scheduled through OnTrac",
    start: { dateTime: start },
    end: { dateTime: end },
    location: interview.location || "",
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  };

  try {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    console.log("✅ Event created:", response.result.htmlLink);

    // ✅ Return both ID and link
    return {
      id: response.result.id,
      htmlLink: response.result.htmlLink,
    };
  } catch (err) {
    handleError(err);
    console.error("❌ Failed to create calendar event:", err);
  }

}

/** ✅ Conflict detection */
export async function checkCalendarConflicts(
  startTime: string,
  endTime: string
): Promise<boolean> {
  if (!isSignedIn()) {
    console.warn("⚠️ Not signed in to Google Calendar — skipping conflict check");
    return false;
  }

  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: startTime,
      timeMax: endTime,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.result.items || [];
    if (events.length > 0) {
      console.log("⚠️ Conflict detected:", events);
      return true;
    } else {
      console.log("✅ No calendar conflicts");
      return false;
    }
  } catch (err) {
    handleError(err);
    console.error("❌ Failed to check calendar conflicts:", err);
    return false;
  }
}

/** ✅ Update existing event */
export async function updateCalendarEvent(eventId: string, interview: {
  type: string;
  date: string;
  location?: string;
  notes?: string;
  jobTitle?: string;
  company?: string;
}) {
  if (!isSignedIn()) {
    console.warn("⚠️ Not signed in — cannot update event");
    return;
  }

  try {
    const start = new Date(interview.date).toISOString();
    const end = new Date(new Date(interview.date).getTime() + 60 * 60 * 1000).toISOString();

    const res = await window.gapi.client.calendar.events.patch({
      calendarId: "primary",
      eventId,
      resource: {
        summary: `Interview (${interview.type}) - ${interview.company || ""}`,
        description: interview.notes || "Interview updated via OnTrac",
        location: interview.location || "",
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });
    console.log("✅ Event updated:", res.result.htmlLink);
    return res.result;
  } catch (err) {
    handleError(err);
    console.error("❌ Failed to update event:", err);
  }
}

/** ✅ Delete existing event */
export async function deleteCalendarEvent(eventId: string) {
  if (!isSignedIn()) {
    console.warn("⚠️ Not signed in — cannot delete event");
    return;
  }
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    console.log(`🗑️ Deleted calendar event: ${eventId}`);
  } catch (err) {
    handleError(err);
    console.error("❌ Failed to delete event:", err);
  }
}