import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "x-dev-user-id": DEV_USER_ID,
  };
}

/**
 * Fetch interview analytics
 */
export async function getInterviewAnalytics() {
  const res = await fetch(`${API_BASE}/api/interviews/analytics`, {
    headers: baseHeaders(),
  });

  if (!res.ok) throw new Error("Failed to load interview analytics");

  return res.json();
}