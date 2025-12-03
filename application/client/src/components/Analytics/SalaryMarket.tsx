import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSalaryAnalytics } from "../../api/salaryAnalytics";

// --- Types ---
interface SalaryProgressionItem {
  jobId: string;
  date: string | Date;
  salary: number;
  company: string;
  title: string;
  negotiationOutcome?: string;
}

export default function SalaryMarket() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getSalaryAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || "Failed to load salary analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading salary insights…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!analytics) return <div className="p-6">No data available</div>;

  const {
    summary,
    progression,
    negotiationStats,
    marketPositioning,
    recommendations,
    compSummary,
    compProgression,
  } = analytics;

  return (
    <div className="p-10 space-y-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-(--brand-navy)">
        Salary & Market Analytics
      </h1>

      {/* 1. COMPENSATION SUMMARY */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Compensation Summary</h2>
        <p>Average Salary: <strong>${summary.avgSalary}</strong></p>
        <p>Median Salary: <strong>${summary.medianSalary}</strong></p>
        <p>Salary Range: <strong>${summary.minSalary}</strong> → <strong>${summary.maxSalary}</strong></p>
      </section>

      {/* 2. SALARY PROGRESSION */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Salary Progression Over Time</h2>

        {progression.length === 0 ? (
          <p className="text-gray-600">No offer history available.</p>
        ) : (
          Object.values(
            progression.reduce((acc: any, entry: any) => {
              if (!acc[entry.jobId] || new Date(entry.date) > new Date(acc[entry.jobId].date)) {
                acc[entry.jobId] = entry;
              }
              return acc;
            }, {})
          )
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((p: any, i: number) => (
              <div key={i} className="flex justify-center items-center gap-4 py-1">
                <p
                  onClick={() => navigate(`/analytics/salary-progress/${p.jobId}`)}
                  className="text-blue-600 underline cursor-pointer hover:text-blue-800 text-center"
                >
                  {new Date(p.date).toLocaleDateString()} —
                  <strong>${p.salary}</strong> at {p.company} ({p.title})
                  {p.negotiationOutcome && ` — Negotiation: ${p.negotiationOutcome}`}
                </p>

                <button
                  onClick={() =>
                    navigate(`/jobs/${p.jobId}/salary`, {
                      state: { from: "/analytics/salary-market" },
                    })
                  }
                  className="text-blue-600 hover:underline text-sm whitespace-nowrap"
                >
                  Salary details →
                </button>
              </div>
            ))
        )}
      </section>

      {/* 3. TOTAL COMPENSATION */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Total Compensation Trends</h2>

        {compProgression.length === 0 ? (
          <p className="text-gray-600">No compensation data yet.</p>
        ) : (
          Object.values(
            compProgression.reduce((acc: any, entry: any) => {
              if (!acc[entry.jobId] || new Date(entry.date) > new Date(acc[entry.jobId].date)) {
                acc[entry.jobId] = entry;
              }
              return acc;
            }, {})
          )
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((p: any, i: number) => (
              <div key={i} className="flex justify-center items-center gap-4 py-1">
                <p
                  onClick={() => navigate(`/analytics/comp-progress/${p.jobId}`)}
                  className="text-blue-600 underline cursor-pointer hover:text-blue-800 text-center"
                >
                  {new Date(p.date).toLocaleDateString()} —
                  <strong>${p.totalComp}</strong> total comp at {p.company} ({p.title})
                </p>

                <button
                  onClick={() =>
                    navigate(`/jobs/${p.jobId}/salary`, {
                      state: { from: "/analytics/salary-market" },
                    })
                  }
                  className="text-blue-600 hover:underline text-sm whitespace-nowrap"
                >
                  Salary details →
                </button>
              </div>
            ))
        )}
      </section>

      {/* 4. CAREER PROGRESSION IMPACT */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Career Progression Impact</h2>

        <p>
          Average Salary Change Per Offer:{" "}
          <strong>{analytics.careerProgression?.avgChangePercent ?? 0}%</strong>
        </p>

        {analytics.careerProgression?.biggestJump && (
          <p>
            Biggest Jump:{" "}
            <strong>{analytics.careerProgression.biggestJump.percent}%</strong>
            ({analytics.careerProgression.biggestJump.from.company} →
            {analytics.careerProgression.biggestJump.to.company})
          </p>
        )}
      </section>

      {/* 5. NEGOTIATION PERFORMANCE */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Negotiation Performance</h2>

        <p>Success Rate: <strong>{negotiationStats.successRate}%</strong></p>
        <p>Negotiation Strength: <strong>{negotiationStats.negotiationStrength}%</strong></p>
      </section>

      {/* 6. RECOMMENDATIONS */}
      <section className="bg-white border rounded-xl shadow-sm p-6 space-y-3 mb-10">
        <h2 className="text-2xl font-semibold text-(--brand-navy)">Recommendations</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          {recommendations.map((r: string, i: number) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}