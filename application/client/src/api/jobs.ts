import API_BASE from "../utils/apiBase";
import { apiFetch } from "../utils/apiFetch";

// ==============================
// 📊 JOB STATS
// ==============================
export const getJobStats = async () => {
  const res = await apiFetch(`${API_BASE}/api/jobs/stats`);
  if (!res.ok) throw new Error("Failed to fetch job statistics");
  return res.json();
};

// ==============================
// 📦 ARCHIVED JOBS
// ==============================
export async function getArchivedJobs() {
  const res = await apiFetch(`${API_BASE}/api/jobs/archived`);
  if (!res.ok) throw new Error("Failed to fetch archived jobs");
  return res.json();
}

// ==============================
// 🗄️ ARCHIVE / UNARCHIVE
// ==============================
export async function toggleArchiveJob(
  id: string,
  archive: boolean,
  reason?: string
) {
  const res = await apiFetch(`${API_BASE}/api/jobs/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archive, reason }),
  });
  if (!res.ok) throw new Error("Failed to update archive status");
  return res.json();
}

// ==============================
// ❌ DELETE JOB
// ==============================
export async function deleteJob(id: string) {
  const res = await apiFetch(`${API_BASE}/api/jobs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

// ==============================
// 📋 GET ALL JOBS
// ==============================
export async function getAllJobs() {
  const res = await apiFetch(`${API_BASE}/api/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

// ==============================
// 📈 SUCCESS ANALYTICS
// ==============================
export async function getSuccessAnalysis() {
  const res = await apiFetch(`${API_BASE}/api/success-analysis`);
  if (!res.ok) throw new Error("Failed to fetch success analysis");
  return res.json();
}

export async function getSuccessPatterns() {
  const res = await apiFetch(
    `${API_BASE}/api/success-analysis/patterns`
  );
  if (!res.ok) throw new Error("Failed to fetch success patterns");
  return res.json();
}

// ==============================
// 🔍 SINGLE JOB
// ==============================
export async function getJobById(id: string) {
  const res = await apiFetch(`${API_BASE}/api/jobs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

export async function getJobsPaginated(page = 1, limit = 10) {
  const res = await apiFetch(
    `${API_BASE}/api/jobs?page=${page}&limit=${limit}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }

  return res.json(); // { data, page, totalPages }
}