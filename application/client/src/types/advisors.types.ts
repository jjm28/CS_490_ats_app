// types/advisors.types.ts

export interface AdvisorPermissions {
  canViewBasicProfile: boolean;
  canViewJobSummary: boolean;
  canViewDocumentsSummary: boolean;
}

export type AdvisorStatus = "pending" | "active" | "revoked";

export interface AdvisorRelationshipSummary {
  id: string;
  ownerUserId: string;
  advisorUserId?: string | null;
  advisorName: string;
  advisorEmail: string;
  advisorType: "Mentor" | "Coach";
  status: AdvisorStatus;
  permissions: AdvisorPermissions;
  advisorProfile?: {
    headline: string;
    specialties: string[];
    isPaidCoach: boolean;
  } | null;
  createdAt: string;
}

export interface AdvisorClientSummary {
  relationshipId: string;
  ownerUserId: string;
  candidate: {
    fullName: string | null;
    headline: string | null;
    industry: string | null;
    experienceLevel: string | null;
  };
  permissions: AdvisorPermissions;
  advisorType: "Mentor" | "Coach";
  status: AdvisorStatus;
  createdAt: string;
}

export interface AdvisorClientProfile {
  relationshipId: string;
  ownerUserId: string;
  advisorUserId: string;
  advisorType: "Mentor" | "Coach";
  permissions: AdvisorPermissions;
  basicProfile: {
    fullName: string | null;
    headline: string | null;
    bio: string | null;
    industry: string | null;
    experienceLevel: string | null;
    location: {
      city?: string;
      state?: string;
    } | null;
  } | null;
  jobSummary: {
    totalJobs: number;
    statusCounts: Record<string, number>;
    topJobs: {
      id: string;
      jobTitle: string;
      company: string;
      status: string;
    }[];
  } | null;
  documentsSummary: {
    resumeCount: number | null;
    coverLetterCount: number | null;
  } | null;
}

export interface AdvisorMessage {
  id: string;
  relationshipId: string;
  ownerUserId: string;
  advisorUserId: string;
  senderRole: "candidate" | "advisor";
  senderUserId: string;
  body: string;
  isReadByCandidate: boolean;
  isReadByAdvisor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorSharingConfig {
  sharedResumeIds: string[];
  sharedCoverLetterIds: string[];
  sharedJobIds: string[];
  shareProgressSummary: boolean;
}



// types/advisors.types.ts

export type AdvisorRecommendationCategory =
  | "resume"
  | "cover_letter"
  | "job"
  | "interview"
  | "general";

export type AdvisorRecommendationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "declined";

export interface AdvisorRecommendation {
  id: string;
  relationshipId: string;
  ownerUserId: string;
  advisorUserId: string;
  title: string;
  description: string;
  category: AdvisorRecommendationCategory;
  jobId: string | null;
  resumeId: string | null;
  coverLetterId: string | null;
  status: AdvisorRecommendationStatus;
  createdBy: "advisor";
  candidateNote?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorSharingOptions {
  resumes: {
    id: string;
    filename: string;
    templateKey: string;
    updatedAt: string;
  }[];
  coverLetters: {
    id: string;
    filename: string;
    templateKey: string;
    updatedAt: string;
  }[];
  jobs: {
    id: string;
    jobTitle: string;
    company: string;
    status: string;
    updatedAt: string;
  }[];
}

// For advisor-side materials, reused in section + modal:
export interface AdvisorClientMaterials {
  documents: {
    resumes: {
      id: string;
      filename: string;
      templateKey: string;
      updatedAt: string;
    }[];
    coverLetters: {
      id: string;
      filename: string;
      templateKey: string;
      updatedAt: string;
    }[];
  } | null;
  applications: {
    jobs: {
      id: string;
      jobTitle: string;
      company: string;
      status: string;
      updatedAt: string;
      createdAt: string;
      applicationDeadline?: string;
    }[];
  } | null;
  progress: {
    enabled: boolean;
    jobStatusCounts?: Record<string, number>;
    recentGoals?: {
      id: string;
      title: string;
      status: string;
      createdAt: string;
      targetDate?: string;
    }[];
    recentMilestones?: {
      id: string;
      title: string;
      description: string;
      achievedAt: string;
    }[];
  } | null;
}


export type AdvisorSessionStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "canceled";

export interface AdvisorAvailability {
  advisorUserId: string;
  weeklySlots: {
    dayOfWeek: number; // 0-6
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
  }[];
  sessionTypes: string[];
  timezone: string;
}

export interface AdvisorSession {
  id: string;
  relationshipId: string;
  ownerUserId: string;
  advisorUserId: string;
  createdByRole: "candidate" | "advisor";
  createdByUserId: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: AdvisorSessionStatus;
  jobId?: string | null;
  resumeId?: string | null;
  coverLetterId?: string | null;
  note?: string;
  createdAt: string;
  updatedAt: string;
    isBillable?: boolean;
  rateAmount?: number | null;
  currency?: string | null;
  paymentStatus?: "pending" | "paid" | "refunded" | "untracked"
   candidateRating?: number | null;
  candidateFeedback?: string | null;
}
export interface AdvisorPerformanceSummary {
  advisorUserId: string;
  totalClients: number;
  totalSessions: number;
  completedSessions: number;
  ratedSessions: number;
  averageRating: number | null;
}

export interface AdvisorSlot {
  startTime: string;
  endTime: string;
}


export interface AdvisorBillingSettings {
  isPaidCoach: boolean;
  rateAmount: number;
  currency: string;
}
