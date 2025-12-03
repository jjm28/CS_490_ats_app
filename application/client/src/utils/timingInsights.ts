// =========================================================
// TYPES
// =========================================================
export type DayStats = {
  day: string;      // "Mon", "Tue"...
  applied: number;
  interviews: number;
  offers: number;
};

type TimingInsightsResult = {
  bestDays: string[];
  worstDays: string[];
  recommendations: string[];
};

// Minimum % difference to be considered meaningful
const SIGNIFICANCE_GAP = 10;

// =========================================================
// MAIN FUNCTION
// =========================================================
export function buildTimingInsights(dayStats: DayStats[]): TimingInsightsResult {

  if (!dayStats || dayStats.length === 0) {
    return {
      bestDays: ["No data"],
      worstDays: ["No data"],
      recommendations: []
    };
  }

  // Compute offer rate per day
  const rates = dayStats
    .map(d => ({
      ...d,
      rate: d.applied > 0 ? Math.round((d.offers / d.applied) * 100) : 0
    }))
    .filter(d => d.applied >= 2); // require minimum 2 applications for stability

  if (rates.length === 0) {
    return {
      bestDays: ["No data"],
      worstDays: ["No data"],
      recommendations: []
    };
  }

  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const diff = best.rate - worst.rate;

  // Not statistically meaningful
  if (diff < SIGNIFICANCE_GAP) {
    return {
      bestDays: ['<span style="color:gray">No statistically significant timing pattern</span>'],
      worstDays: ['<span style="color:gray">No statistically significant timing pattern</span>'],
      recommendations: []
    };
  }

  const recommendations = [
    `Your strongest conversion rate occurs on <strong>${best.day}</strong>, outperforming <strong>${worst.day}</strong> by ${diff}%.`,
    `Prioritize applying on <strong>${best.day}</strong>.`,
    `Avoid relying on <strong>${worst.day}</strong>, which shows the lowest conversion in your data.`
  ];

  return {
    bestDays: [best.day],
    worstDays: [worst.day],
    recommendations
  };
}