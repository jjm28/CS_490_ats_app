import API_BASE from "../utils/apiBase";
import { apiFetch } from "../utils/apiFetch";

// api/jobs.ts
import type { Job, WorkMode } from "../types/jobs.types";

export interface CommuterPlannerJob {
  id: string;
  title: string;
  company: string;
  workMode?: WorkMode;
  location: {
    raw?: string;
    normalized?: string;
    city?: string;
    state?: string;
    countryCode?: string;
    postalCode?: string;
  };
  geo: { lat: number; lng: number };
  commute: { distanceKm: number; durationMinutes: number } | null;
  timeZone: string | null;
}

export interface CommuterPlannerHome {
  location: string | null;
  geo: { lat: number; lng: number } | null;
  timeZone: string | null;
}

export interface CommuterPlannerResponse {
  home: CommuterPlannerHome | null;
  jobs: CommuterPlannerJob[];
}

interface CommuterPlannerFilters {
  workMode?: WorkMode[];
  maxDistanceKm?: number;
  maxDurationMinutes?: number;
}

export async function fetchCommuterPlannerData(
  filters: CommuterPlannerFilters,
  jobId?: string
): Promise<CommuterPlannerResponse> {
  const params = new URLSearchParams();

  if (jobId) params.set("jobId", jobId);
  if (filters.workMode && filters.workMode.length > 0) {
    params.set("workMode", filters.workMode.join(","));
  }
  if (filters.maxDistanceKm != null) {
    params.set("maxDistanceKm", String(filters.maxDistanceKm));
  }
  if (filters.maxDurationMinutes != null) {
    params.set("maxDurationMinutes", String(filters.maxDurationMinutes));
  }

  const tokenRaw = localStorage.getItem("authUser");
  const token = tokenRaw ? JSON.parse(tokenRaw).token : null;
  const res = await fetch(
    `${API_BASE}/api/jobs/map?${params.toString()}`,
    {   method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load commuter planner data");
  }
  const data = await res.json()
console.log(data)
  return data
}



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