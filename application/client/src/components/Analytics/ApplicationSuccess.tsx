import { useEffect, useState } from "react";
import { getSuccessAnalysis } from "../../api/jobs";
import { buildApplicationSuccessInsights } from "../../utils/applicationInsights";

// -----------------------------
// Types
// -----------------------------
interface SuccessItem {
  segment: string;
  offerRate: number;
}

interface ComparisonItem {
  segment: string;
  offerRate: number;
}

interface SuccessResponse {
  byIndustry: SuccessItem[];
  byCompanySize: SuccessItem[];
  byRoleType: SuccessItem[];
  byMethod: SuccessItem[];
  bySource: SuccessItem[];
  successVsRejected: {
    industries: ComparisonItem[];
    companies: ComparisonItem[];
    applicationMethods: ComparisonItem[];
    applicationSources: ComparisonItem[];
  };
  resumeImpact: {
    customizedResumeRate: number;
    genericResumeRate: number;
    customizedCoverRate: number;
    genericCoverRate: number;
  };
  timingPatterns: {
    bestDays: string[];
    worstDays: string[];
  };
}

// -----------------------------
// Progress Bar (OnTrac-styled)
// -----------------------------
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-(--brand-light)">
      <div
        className="h-full rounded-full bg-(--brand-navy) transition-all"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
}

// -----------------------------
// Metric Card
// -----------------------------
function MetricCard({ title, items }: { title: string; items: SuccessItem[] }) {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-(--brand-navy) mb-4">
        {title}
      </h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.segment} className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-700">
              <span>{item.segment}</span>
              <span className="font-semibold text-(--brand-navy)">
                {item.offerRate}%
              </span>
            </div>
            <ProgressBar value={item.offerRate} />
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------
// Side-by-side comparison card
// -----------------------------
function ComparisonCard({
  title,
  data,
}: {
  title: string;
  data: ComparisonItem[];
}) {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 w-full">
      <h3 className="text-lg font-semibold text-(--brand-navy) mb-4">
        {title}
      </h3>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.segment} className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-700">
              <span>{item.segment}</span>
              <span className="font-semibold text-(--brand-navy)">
                {item.offerRate}%
              </span>
            </div>
            <ProgressBar value={item.offerRate} />
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------
// Main Component
// -----------------------------
export default function ApplicationSuccess() {
  const [data, setData] = useState<SuccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getSuccessAnalysis();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">No data available.</div>;

  // Normalize / type the data so TS is happy
  const byIndustry: SuccessItem[] = data.byIndustry ?? [];
  const byCompanySize: SuccessItem[] = data.byCompanySize ?? [];
  const byRoleType: SuccessItem[] = data.byRoleType ?? [];
  const byMethod: SuccessItem[] = data.byMethod ?? [];
  const bySource: SuccessItem[] = data.bySource ?? [];

  const successVsRejected: SuccessResponse["successVsRejected"] =
    data.successVsRejected ?? {
      industries: [] as ComparisonItem[],
      companies: [] as ComparisonItem[],
      applicationMethods: [] as ComparisonItem[],
      applicationSources: [] as ComparisonItem[],
    };

  const resumeImpact = data.resumeImpact ?? {
    customizedResumeRate: 0,
    genericResumeRate: 0,
    customizedCoverRate: 0,
    genericCoverRate: 0,
  };

  const timingPatterns = data.timingPatterns ?? {
    bestDays: ["No data"],
    worstDays: ["No data"],
  };

  // Generate text-based insights
  const insights = buildApplicationSuccessInsights({
    industries: byIndustry,
    roleTypes: byRoleType,
    methods: byMethod,
    sources: bySource,
    successVsRejected,
  });

  return (
    <div className="p-10 space-y-16">

      {/* PAGE HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-(--brand-navy)">
          Application Success Analysis
        </h1>
        <p className="text-gray-600">
          Understand what types of jobs and application behaviors lead to the best results.
        </p>
      </div>

      {/* ========================================= */}
      {/* SECTION 1: JOB CHARACTERISTICS */}
      {/* ========================================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-(--brand-navy)">
          Job Characteristics That Lead to Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="By Industry" items={byIndustry} />
          <MetricCard title="By Company Size" items={byCompanySize} />
          <MetricCard title="By Role Type" items={byRoleType} />
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 2: APPLICATION BEHAVIORS */}
      {/* ========================================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-(--brand-navy)">
          Application Behaviors That Lead to Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard title="By Application Method" items={byMethod} />
          <MetricCard title="By Application Source" items={bySource} />
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 3: SUCCESS VS REJECTIONS (TEXT INSIGHTS) */}
      {/* ========================================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-(--brand-navy)">
          What Separates Offers From Rejections
        </h2>

        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-(--brand-navy)">Key Patterns</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {insights.patternSummary}
          </p>

          <h3 className="font-semibold text-(--brand-navy) mt-4">
            Recommendations
          </h3>
          <ul className="list-disc pl-5 text-gray-700 space-y-2">
            {insights.recommendations.map((rec, i) => (
              <p key={i}>{rec}</p>
            ))}
          </ul>
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 4: RESUME / COVER LETTER IMPACT */}
      {/* ========================================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-(--brand-navy)">
          Resume & Cover Letter Impact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ComparisonCard
            title="Customized vs Generic Resumes"
            data={[
              { segment: "Customized Resume", offerRate: resumeImpact.customizedResumeRate },
              { segment: "Generic Resume", offerRate: resumeImpact.genericResumeRate },
            ]}
          />

          <ComparisonCard
            title="Customized vs Generic Cover Letters"
            data={[
              { segment: "Customized Cover Letter", offerRate: resumeImpact.customizedCoverRate },
              { segment: "Generic Cover Letter", offerRate: resumeImpact.genericCoverRate },
            ]}
          />
        </div>
      </section>

      {/* ========================================= */}
      {/* SECTION 5: TIMING PATTERNS */}
      {/* ========================================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-(--brand-navy)">
          Timing Insights
        </h2>

        <div className="bg-white border shadow-sm rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-(--brand-navy)">Best Days to Apply</h3>
            <p className="text-gray-700">{timingPatterns.bestDays.join(", ")}</p>
          </div>

          <div>
            <h3 className="font-semibold text-(--brand-navy)">Worst Days to Apply</h3>
            <p className="text-gray-700">{timingPatterns.worstDays.join(", ")}</p>
          </div>
        </div>
      </section>

    </div>
  );
}