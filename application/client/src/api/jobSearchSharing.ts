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

// ... your existing fetchSharingProfile / updateSharingProfile ...

// ---- Report types ----
export interface ReportGoalSummary {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
  percent: number;
}

export interface ReportMilestoneSummary {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
  type?: string;
  relatedJobId?: string;
}

export interface ActivitySummary {
  // extend when you add job stats
  // jobsAdded?: number;
}

export interface JobSearchProgressReport {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  goalsSummary: ReportGoalSummary[];
  milestones: ReportMilestoneSummary[];
  activitySummary: ActivitySummary | null;
  insights: string[];
}

export async function generateProgressReportApi(params: {
  ownerId: string;
  viewerId?: string;
  rangeFrom?: string;
  rangeTo?: string;
}): Promise<JobSearchProgressReport> {
  const { ownerId, viewerId, rangeFrom, rangeTo } = params;

  const query = new URLSearchParams();
  query.set("ownerId", ownerId);
  if (viewerId) query.set("viewerId", viewerId);

  const res = await fetch(
    `${API_BASE}/api/job-search/reports/generate?${query.toString()}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rangeFrom, rangeTo }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to generate progress report");
  }

  return res.json();
}

export interface EncouragementEvent {
  _id: string;
  ownerUserId: string;
  sourceUserId: string;
  type: "goal_completed" | "milestone_added" | "streak" | "custom" | string;
  targetGoalId?: string;
  targetMilestoneId?: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEncouragementEvents(
  userId: string,
  limit: number = 20
): Promise<EncouragementEvent[]> {
  const params = new URLSearchParams();
  params.set("userId", userId);
  params.set("limit", String(limit));

  const res = await fetch(
    `${API_BASE}/api/job-search/encouragement?${params.toString()}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    throw new Error("Failed to load encouragement events");
  }
  return res.json();
}



export interface PartnerEngagementItem {
  partnerUserId: string;
  viewsProgress: number;
  viewsReport: number;
  viewsMilestones: number;
  reactions: number;
  totalEvents: number;
  lastEngagedAt: string | null;
  engagementScore: number;
  engagementLevel: "none" | "low" | "moderate" | "high" | string;
}

export interface PartnerEngagementSummary {
  ownerUserId: string;
  since: string;
  until: string;
  totalPartners: number;
  engagedPartners: number;
  totalEvents: number;
  goalsCompleted: number;
  milestonesAdded: number;
  partners: PartnerEngagementItem[];
}

export async function fetchPartnerEngagementSummary(
  ownerId: string,
  sinceDays: number = 30
): Promise<PartnerEngagementSummary> {
  const params = new URLSearchParams();
  params.set("ownerId", ownerId);
  params.set("sinceDays", String(sinceDays));

  const res = await fetch(
    `${API_BASE}/api/job-search/engagement/summary?${params.toString()}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to load partner engagement summary");
  }

  return res.json();
}


export interface DailyActivitySample {
  dayKey: string;          // "YYYY-MM-DD"
  totalActions: number;
  progressCount: number;
  milestonesCount: number;
}

export interface MotivationStats {
  ownerUserId: string;
  since: string;
  until: string;
  sinceDays: number;
  dailyActivity: DailyActivitySample[];
  currentStreak: number;
  longestStreak: number;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  completionRate: number;
  messages: string[];
}

export async function fetchMotivationStats(
  ownerId: string,
  sinceDays: number = 14
): Promise<MotivationStats> {
  const params = new URLSearchParams();
  params.set("ownerId", ownerId);
  params.set("sinceDays", String(sinceDays));

  const res = await fetch(
    `${API_BASE}/api/job-search/motivation?${params.toString()}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to load motivation stats");
  }

  return res.json();
}

export interface WeeklyImpact {
  weekKey: string;          // "YYYY-MM-DD" of week start
  weekStart: string;
  engagementEvents: number;
  actionCount: number;
  goalsCompleted: number;
}

export interface TopPartnerImpact {
  partnerUserId: string;
  engagementLevel: string;
  totalEvents: number;
}

export interface AccountabilityInsights {
  ownerUserId: string;
  since: string;
  until: string;
  sinceWeeks: number;
  highEngagementDefinition: {
    minEventsPerWeek: number;
  };
  weekly: WeeklyImpact[];
  stats: {
    totalEngagementEvents: number;
    totalActions: number;
    totalGoalsCompleted: number;
    highEngagementWeeks: number;
    zeroEngagementWeeks: number;
    avgActionsHigh: number;
    avgActionsZero: number;
    avgGoalsHigh: number;
    avgGoalsZero: number;
  };
  topPartners: TopPartnerImpact[];
  headline: string;
  insights: string[];
  suggestions: string[];
  summaryForAi: string;
}

export async function fetchAccountabilityInsights(
  ownerId: string,
  sinceWeeks: number = 8
): Promise<AccountabilityInsights> {
  const params = new URLSearchParams();
  params.set("ownerId", ownerId);
  params.set("sinceWeeks", String(sinceWeeks));

  const res = await fetch(
    `${API_BASE}/api/job-search/insights?${params.toString()}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to load accountability insights");
  }

  return res.json();
}
