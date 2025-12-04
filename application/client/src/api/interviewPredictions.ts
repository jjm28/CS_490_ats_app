// src/api/interviewPredictions.ts
import API_BASE from "../utils/apiBase";

function getAuthToken(): string {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getDevUserId(): string {
  let id = localStorage.getItem("devUserId");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("devUserId", id);
  }
  return id;
}

function getUserId(): string | null {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  return (
    u?._id ??
    u?.id ??
    u?.userId ??
    u?.userid ??
    u?.user?._id ??
    u?.user?.id ??
    u?.user?.userId ??
    u?.user?.userid ??
    null
  );
}

function authHeaders() {
  const token = getAuthToken();
  const dev = getDevUserId();
  const userId = getUserId();
  
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? {} : { "x-dev-user-id": dev }),
  };
}

function baseHeaders() {
  return authHeaders();
}

export interface SuccessPrediction {
  _id: string;
  userId: string;
  jobId: string;
  interviewId: string;
  successProbability: number;
  confidence: 'low' | 'medium' | 'high';
  factors: {
    preparationScore: number;
    companyResearchScore: number;
    practiceScore: number;
    historicalPerformance: number;
    roleMatchScore: number;
  };
  weights: {
    preparation: number;
    companyResearch: number;
    practice: number;
    historicalPerformance: number;
    roleMatch: number;
  };
  recommendations: Recommendation[];
  interviewContext: {
    company: string;
    jobTitle: string;
    interviewType: string;
    interviewDate: Date;
    daysUntilInterview: number;
  };
  actualOutcome?: 'pending' | 'passed' | 'rejected' | 'offer';
  predictionAccurate?: boolean | null;
  accuracyScore?: number | null;
  predictedAt: Date;
  lastRecalculatedAt?: Date;
  interview?: {
    _id: string;
    type: string;
    date: Date;
    locationOrLink: string;
  };
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'preparation' | 'research' | 'practice' | 'timing' | 'strategy';
  action: string;
  potentialImpact: number;
  completed: boolean;
  completedAt?: Date;
}

export interface AccuracyStats {
  totalPredictions: number;
  accurateCount: number;
  inaccurateCount: number;
  uncertainCount: number;
  accuracyRate: number | null;
  averageAccuracyScore: number | null;
}

/**
 * Get success probability predictions for all upcoming interviews
 */
export async function getUpcomingPredictions(): Promise<SuccessPrediction[]> {
  const res = await fetch(`${API_BASE}/api/interview-predictions/upcoming`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch predictions");
  return res.json();
}

/**
 * Get or calculate prediction for a specific interview
 */
export async function getPrediction(
  interviewId: string,
  jobId: string
): Promise<SuccessPrediction> {
  const res = await fetch(
    `${API_BASE}/api/interview-predictions/${interviewId}?jobId=${jobId}`,
    {
      headers: baseHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch prediction");
  return res.json();
}

/**
 * Force recalculation of success probability
 */
export async function recalculatePrediction(
  interviewId: string,
  jobId: string
): Promise<SuccessPrediction> {
  const res = await fetch(
    `${API_BASE}/api/interview-predictions/${interviewId}/recalculate?jobId=${jobId}`,
    {
      method: "POST",
      headers: baseHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to recalculate prediction");
  return res.json();
}

/**
 * Update prediction with actual interview outcome
 */
export async function updatePredictionOutcome(
  predictionId: string,
  actualOutcome: "passed" | "rejected" | "offer"
): Promise<SuccessPrediction> {
  const res = await fetch(
    `${API_BASE}/api/interview-predictions/${predictionId}/outcome`,
    {
      method: "PUT",
      headers: baseHeaders(),
      body: JSON.stringify({ actualOutcome }),
    }
  );
  if (!res.ok) throw new Error("Failed to update outcome");
  return res.json();
}

/**
 * Get prediction accuracy statistics for the user
 */
export async function getAccuracyStats(): Promise<AccuracyStats> {
  const res = await fetch(`${API_BASE}/api/interview-predictions/accuracy/stats`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch accuracy stats");
  return res.json();
}

/**
 * Mark a recommendation as completed
 */
export async function markRecommendationComplete(
  predictionId: string,
  recommendationIndex: number
): Promise<SuccessPrediction> {
  const res = await fetch(
    `${API_BASE}/api/interview-predictions/${predictionId}/recommendations/${recommendationIndex}/complete`,
    {
      method: "PUT",
      headers: baseHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to mark recommendation complete");
  return res.json();
}