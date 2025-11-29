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

function pluralize(label: string) {
  const lower = label.toLowerCase();
  if (lower === "industry") return "industries";
  if (lower === "role type") return "role types";
  if (lower === "application method") return "application methods";
  if (lower === "application source") return "application sources";
  return label + "s";
}

function buildFinding(label: string, items: SuccessItem[]) {
  if (!items || items.length === 0) return null;

  const plural = pluralize(label);

  const sorted = [...items].sort((a, b) => b.offerRate - a.offerRate);
  const high = sorted[0];
  const low = sorted[sorted.length - 1];

  return `${high.segment} (${high.offerRate}%) shows a noticeably higher offer rate out of all ${plural}, whereas ${low.segment} (${low.offerRate}%) shows a noticeably lower offer rate.`;
}

export function buildApplicationSuccessInsights({
  industries,
  roleTypes,
  methods,
  sources,
  successVsRejected,
}: BuildInsightsArgs): InsightsResult {
  const findings: string[] = [];
  const recommendations: string[] = [];

  // Build Key Pattern lines (no labels now)
  const industryFinding = buildFinding("industry", industries);
  if (industryFinding) findings.push(industryFinding);

  const roleTypeFinding = buildFinding("role type", roleTypes);
  if (roleTypeFinding) findings.push(roleTypeFinding);

  const methodFinding = buildFinding("application method", methods);
  if (methodFinding) findings.push(methodFinding);

  const sourceFinding = buildFinding("application source", sources);
  if (sourceFinding) findings.push(sourceFinding);

  // Build combined best-case recommendation
  const topIndustry = [...industries].sort((a, b) => b.offerRate - a.offerRate)[0]?.segment;
  const topRole = [...roleTypes].sort((a, b) => b.offerRate - a.offerRate)[0]?.segment;
  const topMethod = [...methods].sort((a, b) => b.offerRate - a.offerRate)[0]?.segment;
  const topSource = [...sources].sort((a, b) => b.offerRate - a.offerRate)[0]?.segment;

  const combined = [
    topRole ? `${topRole} roles` : "",
    topIndustry ? `in ${topIndustry}` : "",
    topMethod ? `applied through ${topMethod}` : "",
    topSource ? `from ${topSource}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (combined.length > 0) {
    recommendations.push(`${combined} are where you see strong-fit opportunities.`);
  }

  // Lowest segments = caution messages
  const lowIndustry = [...industries].sort((a, b) => a.offerRate - b.offerRate)[0];
  const lowRole = [...roleTypes].sort((a, b) => a.offerRate - b.offerRate)[0];
  const lowMethod = [...methods].sort((a, b) => a.offerRate - b.offerRate)[0];
  const lowSource = [...sources].sort((a, b) => a.offerRate - b.offerRate)[0];

  if (lowIndustry)
    recommendations.push(`Be more selective with ${lowIndustry.segment} roles unless they are an excellent match.`);
  if (lowRole)
    recommendations.push(`Be more selective with ${lowRole.segment} roles unless they are an excellent match.`);
  if (lowMethod)
    recommendations.push(`Be more selective with ${lowMethod.segment} applications unless they are an excellent match.`);
  if (lowSource)
    recommendations.push(`Be more selective with applications submitted via ${lowSource.segment} unless they are an excellent match.`);

  return {
    patternSummary: findings.join("\n"),
    recommendations,
  };
}