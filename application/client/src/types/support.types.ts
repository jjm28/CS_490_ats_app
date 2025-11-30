export type SupporterRelationship =
  | "parent"
  | "sibling"
  | "partner"
  | "friend"
  | "mentor"
  | "other";

export type SupporterStatus = "invited" | "accepted" | "revoked";

export interface SupporterPermissions {
  canSeeProgressSummary: boolean;
  canSeeCompanyNames: boolean;
  canSeeInterviewSchedule: boolean;
  canSeeRejections: boolean;
  canSeeSalaryInfo: boolean;
  canSeeNotes: boolean;
  canSeeWellbeingCheckins: boolean;
}

export type SupporterPrivacyPresetKey = "high_level" | "standard" | "deep";

export interface SupporterBoundaries {
  preferredContactChannel: "email" | "sms" | "in_app" | "none";
  preferredCheckinFrequency: "daily" | "weekly" | "monthly" | "ad_hoc";
  topicsOffLimits: string[];
  userMessageToSupporter?: string;
}

export interface Supporter {
  _id: string;
  ownerUserId: string;
  fullName: string;
  email: string;
  relationship: SupporterRelationship;
  status: SupporterStatus;
  invitedAt: string;
  acceptedAt?: string;
  lastViewedAt?: string;
  permissions: SupporterPermissions;
  boundaries: SupporterBoundaries;
  createdAt: string;
  updatedAt: string;
}

// Summary payload (from GET /api/supporters/:supporterId/summary)
export interface ProgressSummary {
  totalApplications: number;
  applicationsThisWeek: number;
  interviewsScheduled: number;
  offers: number;
  statusTrend: string;
  consistencyScore: number;
}

export interface UpcomingInterview {
  company?: string | null;
  jobTitle?: string | null;
  date?: string;
  message?: string;
}

export interface ActivityItem {
  type: "application" | "interview" | "offer" | "update";
  title: string;
  company?: string | null;
  status?: string | null;
  date: string;
}

export interface WellbeingSummary {
  stressLevelLabel: string;
  moodLabel: string;
  stressScore: number;
  moodScore: number;
  trend: string;
  lastUpdatedAt?: string;
}

export interface SupporterSummaryPayload {
  supporter: {
    id: string;
    fullName: string;
    relationship: string;
  };
  ownerUserId: string;
  summary: {
    progressSummary: ProgressSummary;
    upcomingInterview: UpcomingInterview | null;
    recentActivity: ActivityItem[];
    wellbeing: WellbeingSummary | null;
    notes: string | null;
    guidance?: SupportGuidance | null; 
     milestones?: MilestoneSummary[]; 
         updates?: SupportUpdate[];
  };
}

export interface WellbeingCheckin {
  _id: string;
  userId: string;
  stressLevel: number;
  moodLevel: number;
  energyLevel?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}


export interface SupportedPerson {
  _id: string; // supporter record id
  ownerUserId: string;
  supporterUserId: string;
  relationship: SupporterRelationship;
  status: SupporterStatus;
  invitedAt?: string;
  acceptedAt?: string;
  lastViewedAt?: string;
  permissions: SupporterPermissions;
  boundaries: SupporterBoundaries;
  jobSeeker: {
    _id: string;
    fullName: string;
    email?: string;
  } | null;
}
export interface SupportGuidanceResource {
  slug: string;
  title: string;
  category: string;
  description?: string;
  audience?: string[];
  stages?: string[];
  stress?: string[];
}


export interface SupportGuidance {
  headline: string;
  summary: string;
  supportTips: string[];
  thingsToAvoid: string[];
  resources: SupportGuidanceResource[];
}


export type MilestoneType =
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_PASSED"
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "NEW_JOB_STARTED"
  | "CUSTOM_CELEBRATION";

export interface MilestoneSummary {
  id: string;
  type: MilestoneType;
  title: string;
  message?: string;
  createdAt: string;
  jobId?: string | null;
  jobCompany?: string | null;
  jobTitle?: string | null;
}


export type SupportUpdateType =
  | "WEEKLY_SUMMARY"
  | "TODAY_FEELING"
  | "PLAN"
  | "OTHER";

export type SupportUpdateTone = "positive" | "mixed" | "tough" | "neutral";

export interface SupportUpdate {
  id: string;
  type: SupportUpdateType;
  title: string;
  body: string;
  toneTag?: SupportUpdateTone | null;
  createdAt: string;
}


export interface WeeklyWellbeingSupportStats {
  weekStart: string; // ISO
  avgStressLevel: number | null;
  avgMoodLevel: number | null;
  hasCheckins: boolean;
  numSupportUpdates: number;
  numMilestones: number;
  numApplications: number;
  numInterviews: number;
  numOffers: number;
}

export interface WellbeingSupportOverview {
  currentWeek: WeeklyWellbeingSupportStats | null;
  weeklyTrend: WeeklyWellbeingSupportStats[];
  simpleInsight: string | null;
  resetPlan: string;
}

