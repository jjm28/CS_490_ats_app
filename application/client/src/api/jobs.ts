import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

function baseHeaders() {
    return {
        "Content-Type": "application/json",
        "x-dev-user-id": DEV_USER_ID,
    };
}

export async function getJobStats() {
    const res = await fetch(`${API_BASE}/api/jobs/stats`, {
        headers: baseHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch job stats");
    return res.json();
}

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