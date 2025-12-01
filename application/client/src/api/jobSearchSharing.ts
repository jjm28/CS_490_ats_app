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


export interface JobSearchGoal {
  _id: string;
  ownerUserId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchGoalProgress {
  _id: string;
  ownerUserId: string;
  goalId: string;
  delta: number;
  newValue: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchMilestone {
  _id: string;
  ownerUserId: string;
  title: string;
  description: string;
  achievedAt: string;
  relatedJobId?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchGoals(userId: string): Promise<JobSearchGoal[]> {
  const res = await fetch(
    `${API_BASE}/api/job-search/goals?userId=${encodeURIComponent(userId)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to load goals");
  return res.json();
}

export async function createGoal(
  userId: string,
  payload: {
    title: string;
    description?: string;
    targetValue: number;
    unit?: string;
    deadline?: string;
  }
): Promise<JobSearchGoal> {
  const res = await fetch(
    `${API_BASE}/api/job-search/goals?userId=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to create goal");
  return res.json();
}

export async function addGoalProgressApi(
  userId: string,
  goalId: string,
  payload: { delta: number; note?: string }
): Promise<{ goal: JobSearchGoal; progressEntry: JobSearchGoalProgress }> {
  const res = await fetch(
    `${API_BASE}/api/job-search/goals/${goalId}/progress?userId=${encodeURIComponent(
      userId
    )}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to add goal progress");
  return res.json();
}

export async function fetchMilestones(
  userId: string
): Promise<JobSearchMilestone[]> {
  const res = await fetch(
    `${API_BASE}/api/job-search/milestones?userId=${encodeURIComponent(userId)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to load milestones");
  return res.json();
}

export async function createMilestone(
  userId: string,
  payload: {
    title: string;
    description?: string;
    achievedAt?: string;
    relatedJobId?: string;
    type?: string;
  }
): Promise<JobSearchMilestone> {
  const res = await fetch(
    `${API_BASE}/api/job-search/milestones?userId=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to create milestone");
  return res.json();
}