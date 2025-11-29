import { useEffect, useState } from "react";
import { getInterviewAnalytics } from "../../../api/interviews";
import { getJobStats } from "../../../api/jobs";

export default function InterviewInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [analyticsData, jobStats] = await Promise.all([
          getInterviewAnalytics(),
          getJobStats()
        ]);

        setData({
          analytics: analyticsData,
          stats: jobStats
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load interview insights");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading interview insights…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">No data available.</div>;

  // ---- FIX: extract properly shaped objects ----
  const analytics = data.analytics;
  const stats = data.stats;

  if (!analytics || !stats)
    return <div className="p-6">No data available.</div>;

  return (
    <div className="p-10 space-y-14 max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold text-(--brand-navy)">
        Interview Performance Insights
      </h1>
      <p className="text-gray-600">
        Track your interview progress, strengths, weaknesses, and improvement over time.
      </p>

      {/* =============================== */}
      {/* INTERVIEW → OFFER CONVERSION   */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Interview-to-Offer Conversion Rate
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          <p className="text-lg">
            <strong>Interview → Offer:</strong>{" "}
            {stats.conversion.interviewToOffer}%
          </p>

          <p className="text-gray-600 text-sm">
            Based only on jobs that reached the Interview stage — whether
            scheduled or dragged manually.
          </p>
        </div>
      </section>

      {/* =============================== */}
      {/* Format Performance */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Performance by Interview Format
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          {analytics.formatPerformance.length === 0 ? (
            <p className="text-gray-500">No interview format data available.</p>
          ) : (
            analytics.formatPerformance.map((f: any) => (
              <p key={f.format}>
                {f.format}: <strong>{f.successRate}% success</strong> ({f.count} interviews)
              </p>
            ))
          )}
        </div>
      </section>

      {/* =============================== */}
      {/* Improvement Trends */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Improvement Trends
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          {analytics.improvementTrends.points.length === 0 ? (
            <p className="text-gray-500">No improvement trend data.</p>
          ) : (
            analytics.improvementTrends.points.map((p: any) => (
              <p key={p.label}>
                {p.label} — Score: {p.realScore}
              </p>
            ))
          )}
        </div>
      </section>

      {/* =============================== */}
      {/* INDUSTRY COMPARISON */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Industry & Company Culture Comparison
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          {analytics.industryComparison.length === 0 ? (
            <p className="text-gray-500">No industry data available.</p>
          ) : (
            analytics.industryComparison.map((i: any) => (
              <p key={i.industry}>
                {i.industry}: <strong>{i.offerRate}% offers</strong> ({i.interviewCount} interviews)
              </p>
            ))
          )}
        </div>
      </section>

      {/* =============================== */}
      {/* FEEDBACK THEMES */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Feedback Themes
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5">
          <strong>Strengths:</strong>
          <ul className="list-disc pl-6 text-gray-700">
            {analytics.feedbackThemes.strengths.map((s: any, i: number) => (
              <li key={i}>{s.theme} ({s.count})</li>
            ))}
          </ul>

          <strong className="block mt-4">Weaknesses:</strong>
          <ul className="list-disc pl-6 text-gray-700">
            {analytics.feedbackThemes.weaknesses.map((w: any, i: number) => (
              <li key={i}>{w.theme} ({w.count})</li>
            ))}
          </ul>
        </div>
      </section>

      {/* =============================== */}
      {/* CONFIDENCE / ANXIETY */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Confidence & Anxiety Tracking
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          {analytics.confidenceTracking.points.map((p: any) => (
            <p key={p.label}>
              {p.label}: Confidence {p.confidence} / Anxiety {p.anxiety}
            </p>
          ))}
        </div>
      </section>

      {/* =============================== */}
      {/* COACHING RECOMMENDATIONS */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Coaching Recommendations
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5">
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            {analytics.coachingRecommendations.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* =============================== */}
      {/* BENCHMARKS */}
      {/* =============================== */}
      <section className="space-y-3 mb-10">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Benchmark Comparison
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
          <p>
            <strong>Overall:</strong> You {analytics.benchmarks.overallRate.you}% —
            Average {analytics.benchmarks.overallRate.average}% —
            Top {analytics.benchmarks.overallRate.top}%
          </p>

          {analytics.benchmarks.formatRates.map((f: any) => (
            <p key={f.format}>
              {f.format}: You {f.you}% — Avg {f.average}% — Top {f.top}%
            </p>
          ))}
        </div>
      </section>

    </div>
  );
}