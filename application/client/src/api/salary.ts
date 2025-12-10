// src/api/salary.ts
import API_BASE from "../utils/apiBase";

export interface SalaryBenchmark {
  jobId: string | null;
  title: string;
  location: string;
  currency: string;
  period: string;
  min: number | null;
  max: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean: number | null;
  wageYear: string | null;
  occupationCode: string | null;
  sources: string[];
  hasData: boolean;
  lastUpdated: string | null;
  scope?: "location" | "national" | "none"; // <-- NEW
}


interface FetchSalaryParams {
  title: string;
  location?: string;
  jobId?: string;
}

export async function fetchSalaryBenchmark(
  params: FetchSalaryParams
): Promise<SalaryBenchmark> {
  const query = new URLSearchParams();

  if (params.title) query.set("title", params.title);
  if (params.location) query.set("location", params.location);
  if (params.jobId) query.set("jobId", params.jobId);

  const url = `${API_BASE}/api/salary/get/benchmark?${query.toString()}`;

  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    // Basic fallback object when API fails
    return {
  jobId: params.jobId || null,
  title: params.title,
  location: params.location || "",
  currency: "USD",
  period: "year",
  min: null,
  max: null,
  p10: null,
  p25: null,
  p50: null,
  p75: null,
  p90: null,
  mean: null,
  wageYear: null,
  occupationCode: null,
  sources: [],
  hasData: false,
  lastUpdated: null,
  scope: "none",
};

  }

  const data = (await res.json()) as SalaryBenchmark;
  return data;
}
