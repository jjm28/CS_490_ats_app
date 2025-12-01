import { useEffect, useState } from "react";
import { getInterviewAnalytics } from "../../../api/interviews";
import { getJobStats } from "../../../api/jobs";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Conversion Rate */}
        <div className="bg-white border rounded-xl shadow-md p-5 space-y-2">
          <h2 className="text-xl font-semibold text-(--brand-navy)">Interview-to-Offer Conversion</h2>
          <p className="text-3xl font-bold">{stats.conversion.interviewToOffer}%</p>
          <p className="text-gray-600 text-sm">
            Based on all interviews you've logged.
          </p>
        </div>

        {/* Format Performance */}
        <div className="bg-white border rounded-xl shadow-md p-5 space-y-2">
          <h2 className="text-xl font-semibold text-(--brand-navy)">Performance by Format</h2>
          {analytics.formatPerformance.map((f: any) => (
            <p key={f.format} className="text-gray-700">
              {f.format}: <strong>{f.successRate}% success</strong> ({f.count} interviews)
            </p>
          ))}
        </div>

      </section>

      {/* =============================== */}
      {/* INDUSTRY COMPARISON */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Industry Comparison
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

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Mental Prep Score
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
          <p className="text-3xl font-bold">
            {analytics.mentalPrep.score}/100
          </p>
          <p className="text-gray-600 text-lg">
            {analytics.mentalPrep.label}
          </p>

          <p className="text-sm text-gray-500">
            Your Mental Prep Score combines confidence, anxiety control, and improvement trends to show how mentally prepared you are for interviews.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Confidence & Anxiety Tracking
        </h2>

        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-6">

          {/* AVG + TREND DISPLAY */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-lg font-semibold">Average Confidence: {analytics.confidenceTracking.avgConfidence.toFixed(1)}</p>
              <p className={`text-sm ${analytics.confidenceTracking.confidenceTrend > 0 ? "text-green-600" : analytics.confidenceTracking.confidenceTrend < 0 ? "text-red-600" : "text-yellow-600"}`}>
                Trend: {analytics.confidenceTracking.confidenceTrend > 0 ? `↑ +${analytics.confidenceTracking.confidenceTrend}` :
                  analytics.confidenceTracking.confidenceTrend < 0 ? `↓ ${analytics.confidenceTracking.confidenceTrend}` :
                    "→ No change"}
              </p>
            </div>

            <div>
              <p className="text-lg font-semibold">Average Anxiety: {analytics.confidenceTracking.avgAnxiety.toFixed(1)}</p>
              <p className={`text-sm ${analytics.confidenceTracking.anxietyTrend > 0 ? "text-green-600" : analytics.confidenceTracking.anxietyTrend < 0 ? "text-red-600" : "text-yellow-600"}`}>
                Trend: {analytics.confidenceTracking.anxietyTrend > 0 ? `↓ -${analytics.confidenceTracking.anxietyTrend}` :
                  analytics.confidenceTracking.anxietyTrend < 0 ? `↑ ${analytics.confidenceTracking.anxietyTrend}` :
                    "→ No change"}
              </p>
            </div>
          </div>

          {/* DUAL LINE CHART */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.confidenceTracking.points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />

                <Line type="monotone" dataKey="confidence" stroke="#0ea5e9" strokeWidth={3} />
                <Line type="monotone" dataKey="anxiety" stroke="#f43f5e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>

      {/* =============================== */}
      {/* IMPROVED COACHING INSIGHTS     */}
      {/* =============================== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">
          Coaching Insights
        </h2>

        <div className="bg-white border rounded-xl shadow-md p-6 space-y-6">

          <div>
            <p className="font-semibold text-lg text-(--brand-navy)">Conversion Rate</p>
            <p className="text-gray-700">{analytics.coachingRecommendations[0]}</p>
          </div>

          <div>
            <p className="font-semibold text-lg text-(--brand-navy)">Format Performance</p>
            <p className="text-gray-700">{analytics.coachingRecommendations[1]}</p>
          </div>

          <div>
            <p className="font-semibold text-lg text-(--brand-navy)">Industry Fit</p>
            <p className="text-gray-700">{analytics.coachingRecommendations[2]}</p>
          </div>

          <div>
            <p className="font-semibold text-lg text-(--brand-navy)">Confidence Levels</p>
            <p className="text-gray-700">{analytics.coachingRecommendations[3]}</p>
          </div>

          <div>
            <p className="font-semibold text-lg text-(--brand-navy)">Anxiety Management</p>
            <p className="text-gray-700">{analytics.coachingRecommendations[4]}</p>
          </div>

        </div>
      </section>
    </div>
  );
}