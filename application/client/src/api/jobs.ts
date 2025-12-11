import API_BASE from "../utils/apiBase";

function baseHeaders() {
    const token = localStorage.getItem("token");
    
    // Dev mode fallback: use x-dev-user-id if available
    const devUserId = localStorage.getItem("x-dev-user-id") || 
                      sessionStorage.getItem("x-dev-user-id");
    
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
    };
}

export const getJobStats = async () => {
  const res = await fetch(`${API_BASE}/api/jobs/stats`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch job statistics");
  return res.json();
};

export async function getArchivedJobs() {
    const res = await fetch(`${API_BASE}/api/jobs/archived`, {
        headers: baseHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch archived jobs");
    return res.json();
}

export async function toggleArchiveJob(id: string, archive: boolean, reason?: string) {
    const res = await fetch(`${API_BASE}/api/jobs/${id}/archive`, {
        method: "PATCH",
        headers: baseHeaders(),
        body: JSON.stringify({ archive, reason }),
    });
    if (!res.ok) throw new Error("Failed to update archive status");
    return res.json();
}

export async function deleteJob(id: string) {
    const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        method: "DELETE",
        headers: baseHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete job");
    return res.json();
}

export async function getAllJobs() {
    const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: baseHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
}

export async function getSuccessAnalysis() {
  const res = await fetch(`${API_BASE}/api/success-analysis`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch success analysis");
  return res.json();
}

export async function getSuccessPatterns() {
  const res = await fetch(`${API_BASE}/api/success-analysis/patterns`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch success patterns");
  return res.json();
}

export async function getJobById(id: string) {
    const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        headers: baseHeaders(),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch job");
    }

    return res.json();
}