// src/api/successAnalytics.ts

// Match the same base URL logic as src/api/resumes.ts
const API =
  (import.meta as any).env?.VITE_API_URL ||
  `${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

// Build headers similar to getAuthHeaders() in resumes.ts
function buildBaseHeaders(): Record<string, string> {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;

  // Token handling (same pattern as resumes.ts)
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

// Small helper for GET requests that returns parsed JSON
async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "GET",
    headers: buildBaseHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request to ${path} failed (${res.status}). ${
        text || "No error body returned from server."
      }`
    );
  }

  return res.json();
}

/**
 * Fetch high-level success overview:
 * - patterns across applications/interviews/offers
 * - timing patterns
 * - competitive analysis
 * - optional predictions + snapshot
 *
 * Backend: GET /api/success/overview
 *   query: includePredictions, snapshot
 */
export async function fetchSuccessOverview(opts?: {
  includePredictions?: boolean;
  snapshot?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts?.includePredictions) params.set("includePredictions", "true");
  if (opts?.snapshot) params.set("snapshot", "true");

  const qs = params.toString();
  const path = `/success/overview${qs ? `?${qs}` : ""}`;

  return apiGet(path);
}

/**
 * Fetch recent success snapshots (daily rollups of overview data)
 *
 * Backend: GET /api/success-snapshots?limit=5
 */
export async function fetchSuccessSnapshots(limit: number = 30) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const path = `/success-snapshots?${params.toString()}`;
  return apiGet(path);
}

/**
 * Fetch deeper statistical analysis of your outcomes
 * (correlations, timing, preparation vs outcomes, etc.)
 *
 * Backend: GET /api/success-analysis
 */
export async function fetchSuccessAnalysis() {
  const path = `/success-analysis`;
  return apiGet(path);
}

/**
 * Fetch pattern-focused view: which industries, roles, sources,
 * and strategies correlate with your best outcomes.
 *
 * Backend: GET /api/success-patterns
 */
export async function fetchSuccessPatterns() {
  const path = `/success-patterns`;
  return apiGet(path);
}
