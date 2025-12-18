// src/components/Applications/api/applicationImport.ts

const rawBase =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:5050";

function normalizeServerBase(input: string) {
  let base = String(input || "").trim();
  if (base.startsWith("/")) base = `${window.location.origin}${base}`;
  base = base.replace(/\/+$/, "");
  if (base.toLowerCase().endsWith("/api")) base = base.slice(0, -4);
  return base;
}

const SERVER_BASE = normalizeServerBase(rawBase);
const API_ROOT = `${SERVER_BASE}/api`;
const IMPORT_BASE = `${API_ROOT}/application-import`;

function buildHeaders(extra?: Record<string, string>) {
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

  token =
    token || localStorage.getItem("token") || sessionStorage.getItem("token") || null;

  const devUserId =
    localStorage.getItem("x-dev-user-id") ||
    sessionStorage.getItem("x-dev-user-id") ||
    localStorage.getItem("devUserId") ||
    sessionStorage.getItem("devUserId") ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("userId");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
    ...(extra || {}),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      json?.error ||
      json?.message ||
      `Request failed (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  return (json ?? {}) as T;
}

export type ImportApplicationEmailPayload = {
  platform: string; // linkedin | indeed | etc.
  sourceType?: string;

  // optional direct job fields (if email extraction fails)
  jobTitle?: string;
  company?: string;
  location?: string;

  // email-ish fields (optional but recommended)
  emailFrom?: string;
  emailSubject?: string;
  emailBodyText?: string;
  emailReceivedAt?: string;

  // dedupe keys
  messageId?: string;
  externalId?: string;

  // timing
  appliedAt?: string;
  timezone?: string;

  // link
  jobUrl?: string;
};

export type ImportApplicationResponse = {
  ok: boolean;
  deduped: boolean;
  reason?: string;

  createdJob?: boolean;
  mergedIntoExistingJob?: boolean;

  jobId?: string | null;
  scheduleId?: string | null;

  schedule?: { created: boolean; scheduleId: string } | null;
  eventId?: string;
  jobMatchVia?: string;
};

export async function importApplicationEmail(payload: ImportApplicationEmailPayload) {
  return requestJson<ImportApplicationResponse>(`${IMPORT_BASE}/email`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}
