export interface AnalyticsFilters {
  from: string;
  to: string;
  cohortId: string | null;
}

export interface EffectivenessMetrics {
  totalJobSeekers: number;
  activeJobSeekers: number;
  applicationsSubmitted: number;
  interviews: number;
  hires: number;
  placementRate: number;
  averageTimeToHireDays: number;
  applicationsPerCandidate: number;
  completedSearchCount: number;
  offerCount: number;
}

export interface OutcomesMetrics {
  hires: number;
  offers: number;
  averageSalary: number;
  offerAcceptanceRate: number;
}

export interface RoiMetrics {
  fixedProgramCost: number;
  programCostPerJobSeeker: number;
  estimatedProgramCost: number;
  estimatedValueFromHires: number;
  roi: number | null;
}

export interface CohortAnalyticsRow {
  cohortId: string;
  name: string;
  memberCount: number;
  activeJobSeekers: number;
  applicationsPerCandidate: number;
  placementRate: number;
  hires: number;
}

export type InsightSeverity = "info" | "warning" | "success";

export interface AnalyticsInsight {
  type: string;
  severity: InsightSeverity;
  message: string;
  details?: string;
}

export interface AnalyticsOverviewResponse {
  filters: AnalyticsFilters;
  effectiveness: EffectivenessMetrics;
  outcomes: OutcomesMetrics;
  roi: RoiMetrics;
  cohorts: CohortAnalyticsRow[];
  insights: AnalyticsInsight[];
}