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
