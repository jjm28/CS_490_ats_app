// src/api/customReports.ts

import API_BASE from "../utils/apiBase";
import { handleError } from "../utils/errorHandler";

// Match the same base URL logic as src/api/successAnalytics.ts / resumes.ts
const API =
  `${API_BASE}/api`;

function buildAuthHeaders(): Record<string, string> {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  const token = (u?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = "Bearer " + token;
  const userObj = raw ? u.user || u : null;
  const uid = userObj?._id || userObj?.id;
  if (uid) {
    headers["x-user-id"] = String(uid);
    headers["x-dev-user-id"] = String(uid);
  }
  return headers;
}

// ✅ Generate report safely
export async function generateCustomReport(filters: any, options: any) {
  const isFile = options.format === "pdf" || options.format === "excel";
  const headers = buildAuthHeaders();

  const res = await fetch(`${API}/custom-reports/generate`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters, options }),
  });

  if (!res.ok) throw new Error(`Report generation failed: ${res.statusText}`);

  // ✅ Handle file vs JSON
  if (isFile) {
    return await res.blob();
  } else {
    return await res.json();
  }
}

// Fetch available filters
export async function fetchJobFilters() {
  const headers = buildAuthHeaders();
  const res = await fetch(`${API}/custom-reports/filters`, { headers });
  if (!res.ok) throw new Error("Failed to fetch job filters");
  return await res.json();
}

// Same header pattern as successAnalytics.ts
function buildBaseHeaders(): Record<string, string> {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;

  // Token handling (same pattern as resumes.ts / successAnalytics.ts)
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

  // Dev / helper headers so backend can attach req.user via x-dev-user-id
  const userObj = raw ? u.user || u : null;
  const uid = userObj?._id;
  if (uid) {
    headers["x-user-id"] = String(uid);
    headers["x-dev-user-id"] = String(uid);
  }

  return headers;
}



// Generic POST helper (parallel to apiGet in successAnalytics.ts)
async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: buildBaseHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    handleError(res, text);
    throw new Error(
      `Request to ${path} failed (${res.status}). ${
        text || "No error body returned from server."
      }`
    );
  }

  return res.json();
}

/**
 * Generate a custom report (JSON, PDF, or Excel).
 *
 * Backend: POST /api/custom-reports/generate
 * body: { filters, options }
 */



