import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

interface GoalPayload {
  weeklyApplicationsGoal: number;
  weeklyInterviewsGoal: number;
}

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "x-dev-user-id": DEV_USER_ID,
  };
}

export async function getGoals() {
  const res = await fetch(`${API_BASE}/api/goals`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load goals");
  return res.json();
}

export async function updateGoals(payload: GoalPayload) {
  const res = await fetch(`${API_BASE}/api/goals`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update goals");
  return res.json();
}