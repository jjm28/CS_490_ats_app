// src/api/jobSearchSharing.ts
import API_BASE from "../utils/apiBase";

export type VisibilityMode = "private" | "partners-only" | "team" | "public-link";
export type ReportFrequency = "none" | "daily" | "weekly" | "monthly";

export interface SharingScopes {
  shareGoals: boolean;
  shareMilestones: boolean;
  shareStats: boolean;
  shareNotes: boolean;
}

export interface JobSearchSharingProfile {
  _id: string;
  ownerUserId: string;
  visibilityMode: VisibilityMode;
  allowedUserIds: string[];
  blockedUserIds: string[];
  scopes: SharingScopes;
  defaultReportFrequency: ReportFrequency;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSharingProfile(userId: string): Promise<JobSearchSharingProfile> {
  const res = await fetch(
    `${API_BASE}/api/job-search/sharing?userId=${encodeURIComponent(userId)}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to load sharing profile");
  }

  return res.json();
}

export async function updateSharingProfile(
  userId: string,
  payload: Partial<{
    visibilityMode: VisibilityMode;
    allowedUserIds: string[];
    blockedUserIds: string[];
    scopes: Partial<SharingScopes>;
    defaultReportFrequency: ReportFrequency;
  }>
): Promise<JobSearchSharingProfile> {
  const res = await fetch(
    `${API_BASE}/api/job-search/sharing?userId=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update sharing profile");
  }

  return res.json();
}
