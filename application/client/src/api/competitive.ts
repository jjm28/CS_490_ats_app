// src/api/competitive.ts

export type TimeSummary = {
  hoursPerWeek: number;
  totalMinutes: number;
  sessions: number;
};

export type UserMetrics = {
  applications: number;
  interviews: number;
  offers: number;
  interviewsPerApplication: number;
  offersPerInterview: number;
  timePerWeek: number;
  timeSummary: TimeSummary;
};

export type PeerBenchmarkBand = {
  average: number;
  top: number;
};

export type PeerBenchmarks = {
  interviewsPerApplication: PeerBenchmarkBand;
  offersPerInterview: PeerBenchmarkBand;
  hoursPerWeek: PeerBenchmarkBand;
};

export type SkillGaps = {
  roleKey: string;
  standardStack: string[];
  userSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  coveragePercent: number;
};

export type ExperienceBenchmarkRange = {
  min: number;
  max: number;
};

export type ExperienceSummary = {
  yearsOfExperience: number | null;
  roleLevel: string;
  benchmarkRange?: ExperienceBenchmarkRange | null;
  position: "below_range" | "within_range" | "above_range" | "unknown" | string;
};

export type ComparisonMetric = {
  you: number;
  average: number;
  top: number;
  position: "below_average" | "above_average" | "top" | "unknown" | string;
};

export type Comparisons = {
  interviewsPerApplication: ComparisonMetric;
  offersPerInterview: ComparisonMetric;
  hoursPerWeek: ComparisonMetric;
};

export type CompetitiveAnalysisResponse = {
  userMetrics: UserMetrics;
  peerBenchmarks: PeerBenchmarks;
  skillGaps: SkillGaps;
  experience: ExperienceSummary;
  comparisons: Comparisons;
  recommendations: string[];
};

export type CompetitiveAnalysisParams = {
  targetRole?: string;      // e.g. "swe" | "data" | "pm"
  roleLevel?: string;       // e.g. "entry" | "mid" | "senior"
  yearsExperience?: number; // optional override
};

function getAuthHeaders() {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch competitive analysis (you vs benchmarks).
 * Backend defaults:
 *   - targetRole = "swe"
 *   - roleLevel  = "entry"
 */
export async function getCompetitiveAnalysis(
  params: CompetitiveAnalysisParams = {}
): Promise<CompetitiveAnalysisResponse> {
  const query = new URLSearchParams();

  if (params.targetRole) query.set("targetRole", params.targetRole);
  if (params.roleLevel) query.set("roleLevel", params.roleLevel);
  if (
    typeof params.yearsExperience === "number" &&
    !Number.isNaN(params.yearsExperience)
  ) {
    query.set("yearsExperience", String(params.yearsExperience));
  }

  const queryString = query.toString();
  const url = `/api/competitive-analysis${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch competitive analysis (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as CompetitiveAnalysisResponse;
  return data;
}


