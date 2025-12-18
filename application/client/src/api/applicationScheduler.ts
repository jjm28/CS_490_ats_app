const rawBase =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:5050";

/* -------------------------------------------------------------------------- */
/*                            BASE URL NORMALIZATION                           */
/* -------------------------------------------------------------------------- */
function normalizeServerBase(input: string) {
  let base = String(input || "").trim();

  // Support relative bases like "/api" by anchoring to current origin
  if (base.startsWith("/")) base = `${window.location.origin}${base}`;

  // strip trailing slashes
  base = base.replace(/\/+$/, "");

  // if someone configured ".../api", strip it so we don't end up with "/api/api"
  if (base.toLowerCase().endsWith("/api")) {
    base = base.slice(0, -4);
  }

  return base;
}

const SERVER_BASE = normalizeServerBase(rawBase);
const API_ROOT = `${SERVER_BASE}/api`;
const SCHED_BASE = `${API_ROOT}/application-scheduler`;

/* -------------------------------------------------------------------------- */
/*                             AUTH HEADER BUILDER                             */
/* -------------------------------------------------------------------------- */
/**
 * Matches backend verifyJWT middleware and devUser fallback.
 * Always sends token or x-dev-user-id if available.
 */
function buildHeaders(extra?: Record<string, string>) {
  // Support multiple token storage styles used in the app
  let token: string | null = null;

  const authUserRaw = localStorage.getItem("authUser");
  if (authUserRaw) {
    try {
      const parsed = JSON.parse(authUserRaw);
      token = parsed?.token || parsed?.accessToken || null;
    } catch {
      // ignore
    }
  }

  token = token || localStorage.getItem("token") || sessionStorage.getItem("token") || null;

  // Dev mode fallback (support all common keys)
  const devUserId =
    localStorage.getItem("x-dev-user-id") ||
    sessionStorage.getItem("x-dev-user-id") ||
    localStorage.getItem("devUserId") ||
    sessionStorage.getItem("devUserId") ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("userId");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
    ...(extra || {}),
  };

  return headers;
}

/* -------------------------------------------------------------------------- */
/*                             GENERIC FETCH WRAPPER                           */
/* -------------------------------------------------------------------------- */
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const msg =
      json?.error ||
      json?.message ||
      `Request failed (${res.status} ${res.statusText})`;
    console.error("❌ requestJson error:", msg);
    throw new Error(msg);
  }

  return (json ?? {}) as T;
}

/* -------------------------------------------------------------------------- */
/*                              TYPES AND MODELS                              */
/* -------------------------------------------------------------------------- */
export interface JobLite {
  _id: string;
  jobTitle?: string;
  title?: string;                     // ✅ added
  company?: string;
  companyName?: string;               // ✅ added
  status?: string;
  applicationDeadline?: string | null;
  deadline?: string | null;           // ✅ added for safety
}

export type BestPracticesResponse = { items: string[] };

export type SubmissionTimeStats = {
  totalApplications: number;
  avgDaysEarly: number;
  bestTimeWindow: string;
  responseSuccessRate: number; // 0..100
  responseByWindow: Record<
    string,
    { total: number; successful: number; successRate: number } // 0..100
  >;
};

export type ApplicationSchedule = {
  _id: string;
  userId: string;
  jobId: string;
  scheduledAt: string;
  deadlineAt?: string | null;
  timezone?: string;
  notificationEmail?: string | null;
  reminders?: {
    remindAt: string;
    type: string;
    sent?: boolean;
    sentAt?: string;
  }[];
  status: "scheduled" | "submitted" | "expired" | "cancelled" | string;
  createdAt?: string;
  updatedAt?: string;
  lastProcessedAt?: string;
  notes?: string[];
};

export type ListSchedulesResponse = { items: ApplicationSchedule[] };

export type CreateSchedulePayload = {
  jobId: string;
  scheduledAt: string;
  deadlineAt?: string | null;
  timezone?: string;
  notificationEmail?: string;
};

/* -------------------------------------------------------------------------- */
/*                            APPLICATION SCHEDULER API                        */
/* -------------------------------------------------------------------------- */

// ✅ Lists all schedules for the current user (matches backend auth)
export async function listSchedules(params?: { status?: string }): Promise<ListSchedulesResponse> {
  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";

  const r: any = await requestJson<any>(`${SCHED_BASE}/schedules${qs}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  // ✅ Backend might return [] or {items: []}
  if (Array.isArray(r)) return { items: r };
  if (r && Array.isArray(r.items)) return { items: r.items };
  return { items: [] };
}

// ✅ Creates a schedule for a job
export async function createSchedule(payload: CreateSchedulePayload) {
  return requestJson<ApplicationSchedule>(`${SCHED_BASE}/schedules`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

// ✅ Reschedules a specific item
export async function rescheduleSchedule(
  scheduleId: string,
  payload: { scheduledAt: string; timezone?: string }
) {
  return requestJson<ApplicationSchedule>(
    `${SCHED_BASE}/schedules/${scheduleId}/reschedule`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    }
  );
}

// ✅ Immediately submits a scheduled job
export async function submitNow(scheduleId: string, payload?: { note?: string }) {
  return requestJson<ApplicationSchedule>(
    `${SCHED_BASE}/schedules/${scheduleId}/submit-now`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload || {}),
    }
  );
}

// ✅ Cancels a scheduled job
export async function cancelSchedule(scheduleId: string) {
  return requestJson<{ ok: boolean }>(`${SCHED_BASE}/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
}

// ✅ Loads best-practice tips
export async function getBestPractices() {
  return requestJson<BestPracticesResponse>(`${SCHED_BASE}/best-practices`, {
    method: "GET",
    headers: buildHeaders(),
  });
}

// ✅ Loads timing statistics
export async function getSubmissionTimeStats() {
  return requestJson<SubmissionTimeStats>(
    `${SCHED_BASE}/stats/submission-time`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );
}

// ✅ Loads lightweight jobs (for dropdowns, etc.)
export async function listJobsLite(): Promise<JobLite[]> {
  const r = await requestJson<any>(`${API_ROOT}/jobs?lite=1`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (Array.isArray(r)) return r as JobLite[];
  if (r && Array.isArray(r.items)) return r.items as JobLite[];
  return [];
}

// ✅ Loads eligible jobs (not yet scheduled)
export async function listEligibleJobsLite(): Promise<JobLite[]> {
  const r = await requestJson<any>(`${SCHED_BASE}/eligible-jobs`, {
    method: "GET",
    headers: buildHeaders(),
  });

  console.log("[eligible-jobs] raw response =", r);

  if (Array.isArray(r)) return r as JobLite[];
  if (r && Array.isArray(r.items)) return r.items as JobLite[];
  return [];
}

// ✅ Default notification email (get/set)
export async function getDefaultNotificationEmail(): Promise<{ email: string | null }> {
  return requestJson<{ email: string | null }>(`${SCHED_BASE}/default-email`, {
    method: "GET",
    headers: buildHeaders(),
  });
}

export async function setDefaultNotificationEmail(
  email: string
): Promise<{ email: string | null }> {
  return requestJson<{ email: string | null }>(`${SCHED_BASE}/default-email`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify({ email }),
  });
}
