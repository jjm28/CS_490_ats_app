// client/src/api/salaryAnalytics.ts

import API_BASE from "../utils/apiBase";

export async function getSalaryAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/salary/analytics`, {
      headers: {
        "Content-Type": "application/json",
        "x-dev-user-id": localStorage.getItem("userId") || localStorage.getItem("devUserId") || "test-user",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch salary analytics");
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Salary analytics API error:", err);
    throw err;
  }
}