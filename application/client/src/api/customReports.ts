// src/api/customReports.ts

// Match the same base URL logic as src/api/successAnalytics.ts / resumes.ts
const API =
  (import.meta as any).env?.VITE_API_URL ||
  `${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

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

function buildAuthHeaders(): Record<string, string> {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;

  const token = (u?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = "Bearer " + token;

  const userObj = raw ? u.user || u : null;
  const uid = userObj?._id || userObj?.id;
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
export async function generateCustomReport(filters: any, options: any) {
  const API =
    import.meta.env?.VITE_API_URL ||
    `${import.meta.env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

  const headers = buildAuthHeaders();
  const isFileFormat = options.format === "pdf" || options.format === "excel";

  const res = await fetch(`${API}/custom-reports/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ filters, options }),
  });

  if (!res.ok) throw new Error(`Report generation failed: ${res.statusText}`);
  return isFileFormat ? res.blob() : res.json();
}

export async function fetchJobFilters() {
  const API =
    import.meta.env?.VITE_API_URL ||
    `${import.meta.env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

  const headers = buildAuthHeaders();
  const res = await fetch(`${API}/custom-reports/filters`, { headers });

  if (!res.ok) throw new Error("Failed to fetch job filters");
  return await res.json();
}

/**
 * (Optional) If you later add a list endpoint:
 * Backend: GET /api/custom-reports
 */
// async function apiGet<T = any>(path: string): Promise<T> {
//   const res = await fetch(`${API}${path}`, {
//     method: "GET",
//     headers: buildBaseHeaders(),
//     credentials: "include",
//   });
//
//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(
//       `Request to ${path} failed (${res.status}). ${
//         text || "No error body returned from server."
//       }`
//     );
//   }
//
//   return res.json();
// }
//
// export async function listCustomReports(): Promise<any> {
//   return apiGet("/custom-reports");
// }
