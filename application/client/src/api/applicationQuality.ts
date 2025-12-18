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

export async function getApplicationQuality(jobId: string) {
  const res = await fetch(
    `${API_BASE}/api/application-quality/${jobId}`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to load application quality");
  }

  return res.json();
}