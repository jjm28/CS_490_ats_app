import API_BASE from "../utils/apiBase";

function baseHeaders() {
    const token = localStorage.getItem("token");
    const devUserId =
        localStorage.getItem("x-dev-user-id") ||
        sessionStorage.getItem("x-dev-user-id");

    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
    };
}

export async function getApplicationMaterialPerformance() {
    const res = await fetch(
        `${API_BASE}/api/analytics/application-materials`,
        { headers: baseHeaders() }
    );

    if (!res.ok) {
        throw new Error("Failed to load application material analytics");
    }

    return res.json();
}

export async function getJobsByMaterialVersion(
  type: "resume" | "cover-letter",
  versionId: string
) {
  const res = await fetch(
    `${API_BASE}/api/analytics/application-materials/${type}/${versionId}`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to load material usage details");
  }

  return res.json();
}

export async function getMaterialComparison(
  type: "resume" | "cover-letter",
  baseId: string
) {
  const res = await fetch(
    `${API_BASE}/api/analytics/application-materials/compare/${type}/${baseId}`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to load material comparison");
  }

  return res.json();
}

export async function getApplicationMethodPerformance() {
  const res = await fetch(
    `${API_BASE}/api/analytics/application-methods`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to load application method performance");
  }

  return res.json();
}

export async function getApplicationTimingAnalytics() {
  const res = await fetch(
    `${API_BASE}/api/analytics/application-timing`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to load application timing analytics");
  }

  return res.json();
}