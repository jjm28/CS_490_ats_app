// client/src/api/offers.ts
import API_BASE from "../utils/apiBase";
import { apiFetch } from "../utils/apiFetch";


export type OfferJob = {
  _id: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  workMode?: string;
  status?: string;
  archived?: boolean;
  archiveReason?: string;

  finalSalary?: number;
  salaryBonus?: number;
  salaryEquity?: number;
  benefitsValue?: number;
};

export async function listOffers(archived: boolean): Promise<OfferJob[]> {
  const res = await apiFetch(`${API_BASE}/api/offers?archived=${archived ? "true" : "false"}`);
  if (!res.ok) throw new Error("Failed to load offers");
  const json = await res.json();
  return json?.data ?? [];
}

export async function updateOfferComp(jobId: string, payload: Partial<OfferJob>): Promise<OfferJob> {
  const res = await apiFetch(`${API_BASE}/api/offers/${jobId}/comp`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update offer compensation");
  return res.json();
}

export type ComparePayload = {
  jobIds: string[];
  baselineColIndex?: number;
  colIndexByJobId?: Record<string, number>;
  scenarioByJobId?: Record<string, { salaryIncreasePct?: number; bonusIncreasePct?: number; equityIncreasePct?: number; benefitsIncreasePct?: number }>;
  ratingsByJobId?: Record<string, { cultureFit?: number; growth?: number; workLifeBalance?: number; remotePolicy?: number }>;
  weights?: {
    financialWeight?: number;
    cultureFitWeight?: number;
    growthWeight?: number;
    workLifeBalanceWeight?: number;
    remotePolicyWeight?: number;
  };
};

export type CompareResult = {
  offers: Array<{
    jobId: string;
    company: string;
    jobTitle: string;
    location: string;
    workMode: string;

    salary: number;
    bonus: number;
    equity: number;
    benefits: number;

    totalComp: number;
    colIndex: number;
    colAdjustedTotal: number;

    nonFinancialScore: number;
    financialScore: number;
    overallScore: number;

    negotiationRecommendations: string[];
  }>;
  matrixRows: Array<{ label: string; key: string }>;
};

export async function compareOffers(payload: ComparePayload): Promise<CompareResult> {
  const res = await apiFetch(`${API_BASE}/api/offers/compare`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to compare offers");
  return res.json();
}

export async function archiveOffer(jobId: string, reason: string): Promise<OfferJob> {
  const res = await apiFetch(`${API_BASE}/api/offers/${jobId}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to archive offer");
  return res.json();
}

export type SavedOfferComparison = {
  _id: string;
  userId: string;
  name: string;
  jobIds: string[];
  inputs: any;   // stored inputs used to compute the comparison
  result: any;   // stored computed result (matrixRows + offers + scores + recs)
  createdAt?: string;
  updatedAt?: string;
};

export async function saveOfferComparison(payload: {
  name: string;
  jobIds: string[];
  inputs: any;
  result: any;
}): Promise<SavedOfferComparison> {
  const res = await apiFetch(`${API_BASE}/api/offers/comparisons`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save comparison");
  const json = await res.json();
  return json.data;
}

export async function listOfferComparisons(): Promise<SavedOfferComparison[]> {
  const res = await apiFetch(`${API_BASE}/api/offers/comparisons`);
  if (!res.ok) throw new Error("Failed to load saved comparisons");
  const json = await res.json();
  return json.data ?? [];
}

export async function getOfferComparison(id: string): Promise<SavedOfferComparison> {
  const res = await apiFetch(`${API_BASE}/api/offers/comparisons/${id}`);
  if (!res.ok) throw new Error("Failed to load saved comparison");
  const json = await res.json();
  return json.data;
}

export async function deleteOfferComparison(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/offers/comparisons/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete saved comparison");
}

export type CareerMilestoneInput = {
  year: number; // 1-10
  title?: string; // title after promotion/milestone
  salaryBumpPct?: number;
  bonusBumpPct?: number;
  equityBumpPct?: number;
  benefitsBumpPct?: number;
  note?: string;
};

export type CareerProjectionInputs = {
  startingCompByJobId?: Record<
    string,
    { salary?: number; bonus?: number; equity?: number; benefits?: number }
  >;

  raiseScenarios?: {
    conservativePct?: number;
    expectedPct?: number;
    optimisticPct?: number;
  };

  bonusGrowthPct?: number;
  equityGrowthPct?: number;
  benefitsGrowthPct?: number;

  milestones?: CareerMilestoneInput[];

  careerGoals?: string;
  salaryGoals?: string;
  nonFinancialGoals?: string;
  notes?: string;
};

export type CareerScenarioProjection = {
  key: "conservative" | "expected" | "optimistic" | string;
  label: string;
  annualRaisePct: number;
  bonusGrowthPct: number;
  equityGrowthPct: number;
  benefitsGrowthPct: number;
  fiveYear: {
    years: number[];
    salary: number[];
    bonus: number[];
    equity: number[];
    benefits: number[];
    totalComp: number[];
    titleByYear?: string[];
  };
  tenYear: {
    years: number[];
    salary: number[];
    bonus: number[];
    equity: number[];
    benefits: number[];
    totalComp: number[];
    titleByYear?: string[];
  };
  fiveYearEndingSalary: number;
  tenYearEndingSalary: number;
  fiveYearEndingTotalComp: number;
  tenYearEndingTotalComp: number;
};

export type CareerProjectionJob = {
  jobId: string;
  company: string;
  jobTitle: string;
  location: string;
  workMode: string;
  scenarios: CareerScenarioProjection[];
};

export type CareerProjectionResult = {
  assumptions?: any;
  milestones?: CareerMilestoneInput[];
  jobs: CareerProjectionJob[];
  analysisSummary?: string;
  recommendation?: any;
};

export async function generateOfferCareerProjection(payload: {
  jobIds: string[];
  inputs: CareerProjectionInputs;
}): Promise<CareerProjectionResult> {
  const res = await apiFetch(`${API_BASE}/api/offers/career-projection`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const msg = json?.error || json?.message || "Failed to generate career projection";
    throw new Error(String(msg));
  }
  return json?.data;
}