// src/types/cohort.ts
export type CohortStatus = "active" | "archived";

export interface Cohort {
  _id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  description: string;
  tags: string[];
  status: CohortStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CohortMemberUser {
  _id: string;
  email: string;
  role: string;
}

export interface CohortMemberProfile {
  fullName: string;
  headline: string;
}

export interface CohortMember {
  _id: string;
  cohortId: string;
  jobSeekerUserId: string;
  joinedAt: string;
  source: "manual" | "import" | "integration";
  user: CohortMemberUser;
  profile: CohortMemberProfile;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
