// ==========================================
// TYPES
// ==========================================
type SuccessItem = {
  segment: string;
  offerRate: number;
};

type ComparisonItem = {
  segment: string;
  offerRate: number;
};

type SuccessVsRejected = {
  industries: ComparisonItem[];
  companies: ComparisonItem[];
  applicationMethods: ComparisonItem[];
  applicationSources: ComparisonItem[];
};

type BuildInsightsArgs = {
  industries: SuccessItem[];
  roleTypes: SuccessItem[];
  methods: SuccessItem[];
  sources: SuccessItem[];
  successVsRejected: SuccessVsRejected;
};

type InsightsResult = {
  patternSummary: string;
  recommendations: string[];
};

// ==========================================
// HELPERS
// ==========================================

// Determine if something is a *meaningful* difference
const SIGNIFICANCE_THRESHOLD = 10; // percentage points

function getSignificantFindings(label: string, items: SuccessItem[]) {
  if (!items || items.length === 0) return null;

  // NEW: Handle 1-item case (no comparison)
  if (items.length === 1) {
    return {
      label,
      best: items[0],
      worst: items[0],
      gap: 0
    };
  }

  const sorted = [...items].sort((a, b) => b.offerRate - a.offerRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const diff = best.offerRate - worst.offerRate;

  if (diff < SIGNIFICANCE_THRESHOLD) {
    return {
      label,
      best,
      worst,
      gap: diff
    };
  }

  return {
    label,
    best,
    worst,
    gap: diff
  };
}


function unique(list: string[]) {
  return [...new Set(list)];
}

// ==========================================
// MAIN INSIGHT GENERATOR (REWRITTEN)
// ==========================================
export function buildApplicationSuccessInsights({
  industries,
  roleTypes,
  methods,
  sources,
}: BuildInsightsArgs): InsightsResult {

  const sections = [
    { label: "industries", data: industries },
    { label: "role types", data: roleTypes },
    { label: "application methods", data: methods },
    { label: "application sources", data: sources },
  ];

  const patterns: string[] = [];
  const recommendations: string[] = [];

  // ------------------------------------------
  // 1. Generate pattern findings
  // ------------------------------------------
  for (const section of sections) {
    const result = getSignificantFindings(section.label, section.data);
    if (!result) continue;

    if (result.gap === 0) {
      patterns.push(
        `${result.best.segment} shows a ${result.best.offerRate}% offer rate.`
      );
    } else {
      patterns.push(
        `${result.best.segment} (${result.best.offerRate}%) outperforms other ${section.label}, showing a ${result.gap}% higher offer rate than ${result.worst.segment} (${result.worst.offerRate}%).`
      );
    }
  }

  // ------------------------------------------
  // 2. Build recommendations based on strongest areas
  // ------------------------------------------
  const bestAreas: string[] = [];

  const topIndustry = [...industries].sort((a, b) => b.offerRate - a.offerRate)[0];
  if (topIndustry) bestAreas.push(`roles in <strong>${topIndustry.segment}</strong>`);

  const topRole = [...roleTypes].sort((a, b) => b.offerRate - a.offerRate)[0];
  if (topRole) bestAreas.push(`<strong>${topRole.segment}</strong> roles`);

  const topMethod = [...methods].sort((a, b) => b.offerRate - a.offerRate)[0];
  if (topMethod) bestAreas.push(`applications submitted via <strong>${topMethod.segment}</strong>`);

  const topSource = [...sources].sort((a, b) => b.offerRate - a.offerRate)[0];
  if (topSource) bestAreas.push(`opportunities sourced from <strong>${topSource.segment}</strong>`);

  if (bestAreas.length > 0) {
    recommendations.push(
      `Focus on ${bestAreas.slice(0, 2).join(" and ")} — these show the strongest conversion patterns.`
    );
    if (recommendations.length === 0) {
      recommendations.push("No recommendations available based on the current data.");
    }
  }

  // ------------------------------------------
  // 3. Generate caution recommendations
  // ------------------------------------------
  const lowAreas: string[] = [];

  const lowIndustry = [...industries].sort((a, b) => a.offerRate - b.offerRate)[0];
  if (lowIndustry) lowAreas.push(`<strong>${lowIndustry.segment}</strong> roles`);

  const lowRole = [...roleTypes].sort((a, b) => a.offerRate - b.offerRate)[0];
  if (lowRole) lowAreas.push(`<strong>${lowRole.segment}</strong> roles`);

  const lowMethod = [...methods].sort((a, b) => a.offerRate - b.offerRate)[0];
  if (lowMethod) lowAreas.push(`applications submitted via <strong>${lowMethod.segment}</strong>`);

  const lowSource = [...sources].sort((a, b) => a.offerRate - b.offerRate)[0];
  if (lowSource) lowAreas.push(`applications coming from <strong>${lowSource.segment}</strong>`);

  if (lowAreas.length > 0) {
    recommendations.push(
      `Be more selective with ${lowAreas.slice(0, 2).join(" and ")} — these show notably lower offer rates.`
    );
  }

  // ------------------------------------------
  // Final Output
  // ------------------------------------------
  return {
    patternSummary: patterns.join("\n"),
    recommendations: unique(recommendations)
  };
}