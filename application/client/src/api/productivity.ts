// src/api/productivity.ts

import API_BASE from "../utils/apiBase";

// Match how other APIs build the base URL
const API =
  `${API_BASE}/api`;

function getProductivityHeaders() {
  // Start with the same pattern as getAuthHeaders in resumes.ts
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;

  const token = (u?.token || localStorage.getItem("token") || "").replace(
    /^Bearer\s+/i,
    ""
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  // Try to resolve the current user's id from authUser
  const userObj = u?.user || u || null;
  const uid = userObj?._id;

  if (uid) {
    // These are what the backend uses via getUserId(req)
    headers["x-user-id"] = String(uid);
    headers["x-dev-user-id"] = String(uid);
  } else {
    // Helpful for debugging if something is off
    console.warn(
      "[productivity] No user id found in authUser; make sure the user is logged in."
    );
  }

  return headers;
}

/* ---------- Types (keep loose so you don't fight TS) ---------- */

export type ActivityType =
  | "job_search"
  | "job_research"
  | "resume_edit"
  | "coverletter_edit"
  | "interview_prep"
  | "networking"
  | string;

export interface ProductivitySession {
  _id: string;
  userId: string;
  jobId?: string | null;
  activityType: ActivityType;
  context?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  energyLevelStart?: number | null;
  energyLevelEnd?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductivityOverview {
  // keep this loose; you can refine later if you want
  summary: any;
  activityBreakdown: any[];
  schedulePatterns: any;
  outcomes: any;
  wellbeing: any;
  energyCorrelation: any;
  recommendations: string[];
}

/* ---------- API calls ---------- */

export async function startProductivitySession(opts: {
  activityType: ActivityType;
  context?: string;
  jobId?: string | null;
  energyLevelStart?: number;
  notes?: string | null;
}): Promise<ProductivitySession> {
  const res = await fetch(`${API}/productivity/sessions/start`, {
    method: "POST",
    headers: getProductivityHeaders(),
    credentials: "include",
    body: JSON.stringify({
      activityType: opts.activityType,
      context: opts.context,
      jobId: opts.jobId ?? null,
      energyLevelStart: opts.energyLevelStart ?? null,
      notes: opts.notes ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to start productivity session (${res.status}). ${text}`
    );
  }

  return res.json();
}

export async function endProductivitySession(opts: {
  sessionId: string;
  energyLevelEnd?: number;
  notes?: string | null;
}): Promise<ProductivitySession> {
  const res = await fetch(`${API}/productivity/sessions/end`, {
    method: "POST",
    headers: getProductivityHeaders(),
    credentials: "include",
    body: JSON.stringify({
      sessionId: opts.sessionId,
      energyLevelEnd: opts.energyLevelEnd ?? null,
      notes: opts.notes ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to end productivity session (${res.status}). ${text}`
    );
  }

  return res.json();
}

export async function getProductivityOverview(opts?: {
  days?: number;
}): Promise<ProductivityOverview> {
  const params = new URLSearchParams();
  if (opts?.days != null) {
    params.set("days", String(opts.days));
  }

  const res = await fetch(
    `${API}/productivity/overview${params.toString() ? `?${params}` : ""}`,
    {
      method: "GET",
      headers: getProductivityHeaders(),
      credentials: "include",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to load productivity overview (${res.status}). ${text}`
    );
  }

  return res.json();
}
