import React, { useEffect, useState } from "react";
import { getJobStats } from "../../api/jobs";
import { getGoals } from "../../api/goals";
import GoalsEditor from "./Goals/GoalsEditor";

function conversionStyles(value: number, good: number, ok: number) {
  if (value >= good) return "text-green-600";
  if (value >= ok) return "text-gray-800";
  return "text-red-600";
}

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getJobStats();
        setStats(data);
        const goalData = await getGoals();
        setGoals(goalData);
      } catch (err: any) {
        setError(err?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="p-6 text-gray-600">
        Loading analytics…
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );

  const applicationsSent = stats?.applicationsSent ?? 0;
  const interviewsScheduled = stats?.interviewsScheduled ?? 0;
  const offersReceived = stats?.offersReceived ?? 0;
  const overallConversion = stats?.overallConversion ?? 0;

  const conversion = stats?.conversion ?? {
    applyToPhone: 0,
    applyToInterview: 0,
    applyToOffer: 0,
    phoneToInterview: 0,
    interviewToOffer: 0,
  };

  // ----- GOAL PROGRESS VALUES -----
  const appsGoal = goals?.weeklyApplicationsGoal ?? 10;
  const interviewsGoal = goals?.weeklyInterviewsGoal ?? 2;

  const appsProgress = Math.min(
    Math.round((applicationsSent / appsGoal) * 100),
    100
  );

  const interviewsProgress = Math.min(
    Math.round((interviewsScheduled / interviewsGoal) * 100),
    100
  );

  return (
    <div className="p-6 space-y-8">
      {/* PAGE HEADER */}

      {/* Centered Title + Subtitle */}
      <div className="w-full text-center mb-4">
        <h1 className="text-3xl font-bold text-(--brand-navy)">Job Search Performance</h1>
        <p className="text-gray-600 mt-1">
          Track your application trends, conversion rates, and performance insights.
        </p>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="p-4 bg-white shadow rounded-lg border">
              <h3 className="text-sm text-gray-500">Applications Sent</h3>
              <div className="text-2xl font-bold mt-1">{applicationsSent}</div>
            </div>

            <div className="p-4 bg-white shadow rounded-lg border">
              <h3 className="text-sm text-gray-500">Interviews Scheduled</h3>
              <div className="text-2xl font-bold mt-1">{interviewsScheduled}</div>
            </div>

            <div className="p-4 bg-white shadow rounded-lg border">
              <h3 className="text-sm text-gray-500">Offers Received</h3>
              <div className="text-2xl font-bold mt-1">{offersReceived}</div>
            </div>

            <div className="p-4 bg-white shadow rounded-lg border">
              <h3 className="text-sm text-gray-500">Overall Conversion</h3>
              <div className={`text-2xl font-bold mt-1 ${conversionStyles(overallConversion, 20, 10)}`}>
                {overallConversion}%
              </div>
            </div>

          </div>

          {/* CONVERSION FUNNEL – STACKED VISUAL FUNNEL */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-4">
            <h2 className="text-xl font-semibold text-(--brand-navy)">Conversion Funnel</h2>
            <p className="text-gray-600 mb-4">See how your applications progress through each stage.</p>

            {/* FUNNEL BLOCK */}
            <div className="space-y-4">

              {/* Applied → Phone Screen */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">Applied → Phone</div>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stats.conversion.applyToPhone > 50
                      ? "bg-green-500"
                      : stats.conversion.applyToPhone > 20
                        ? "bg-gray-500"
                        : "bg-red-500"
                      }`}
                    style={{ width: `${stats.conversion.applyToPhone}%` }}
                  ></div>
                </div>
                <div className={`w-12 text-right font-semibold ${conversionStyles(stats.conversion.applyToPhone, 50, 20)}`}>
                  {stats.conversion.applyToPhone}%
                </div>
              </div>

              {/* Applied → Interview */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">Applied → Interview</div>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${conversion.applyToInterview > 30
                      ? "bg-green-500"
                      : conversion.applyToInterview > 10
                        ? "bg-gray-500"
                        : "bg-red-500"
                      }`}
                    style={{ width: `${conversion.applyToInterview}%` }}
                  />
                </div>
                <div
                  className={`w-12 text-right font-semibold ${conversionStyles(
                    conversion.applyToInterview,
                    30,
                    10
                  )}`}
                >
                  {conversion.applyToInterview}%
                </div>
              </div>

              {/* Applied → Offer */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">Applied → Offer</div>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${conversion.applyToOffer > 10
                      ? "bg-green-500"
                      : conversion.applyToOffer > 3
                        ? "bg-gray-500"
                        : "bg-red-500"
                      }`}
                    style={{ width: `${conversion.applyToOffer}%` }}
                  />
                </div>
                <div
                  className={`w-12 text-right font-semibold ${conversionStyles(
                    conversion.applyToOffer,
                    10,
                    3
                  )}`}
                >
                  {conversion.applyToOffer}%
                </div>
              </div>
            </div>
          </div>

          {/* APPLICATION TREND – LAST 7 DAYS */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-4">
            <h2 className="text-xl font-semibold text-brand-navy">
              Application Volume (Last 7 Days)
            </h2>

            <p className="text-gray-600 text-sm">
              A quick look at how many jobs you applied to each day.
            </p>

            <div className="grid grid-cols-7 gap-3 text-center">
              {Object.entries(stats.applicationTrend7Days).map(([day, count]) => {
                const num = Number(count); // <-- FIX
                return (
                  <div key={day} className="flex flex-col items-center">
                    <span className="text-sm text-gray-500">{day}</span>

                    {/* Tiny bar */}
                    <div className="h-12 w-3 bg-gray-200 rounded-full overflow-hidden flex items-end">
                      <div
                        className="bg-[var(--brand-sage)] w-full rounded-full"
                        style={{ height: `${num * 20}px` }}
                      />
                    </div>

                    <span className="text-lg font-semibold text-(--brand-navy)">{num}</span>
                  </div>
                );
              })}
            </div>
            {/* Trend insights */}
            <div className="text-sm text-gray-600 mt-2">
              <p>
                Weekly total:{" "}
                <strong>
                  {Object.values(stats.applicationTrend7Days as Record<string, number>)
                    .reduce((a, b) => a + b, 0)}
                </strong>
              </p>
              <p>
                Most active day:{" "}
                <strong>{stats.successPatterns.mostActiveDay}</strong>
              </p>
            </div>

          </div>

          {/* TIME TO RESPONSE */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-3">
            <h2 className="text-xl font-semibold text-(--brand-navy)">Time to Response</h2>

            <p className="text-gray-600">
              Average time for companies to send their first response (phone screen, interview, rejection, or offer).
            </p>

            <div className="flex flex-col items-center justify-center h-40 bg-gray-50 border border-dashed rounded-md">
              <span className="text-4xl font-bold text-(--brand-navy)">
                {stats?.averageResponseTimeDisplay ?? "—"}
              </span>
              <span className="text-gray-500 mt-2 text-sm">
                Based on {stats?.applicationsSent ?? 0} applications
              </span>
            </div>
          </div>

          {/* SUCCESS PATTERNS */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-3">
            <h2 className="text-xl font-semibold text-(--brand-navy)">Success Patterns</h2>
            <p className="text-gray-600">
              Identify when and where your applications perform best.
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md border text-gray-700">
                • You apply most frequently on{" "}
                <strong>{stats.successPatterns.mostActiveDay}</strong>.
              </div>

              <div className="bg-gray-50 p-3 rounded-md border text-gray-700">
                • Interview frequency:{" "}
                <strong>{stats.successPatterns.interviewRate}</strong>.
              </div>

              <div className="bg-gray-50 p-3 rounded-md border text-gray-700">
                • Fastest response time:{" "}
                <strong>{stats.successPatterns.avgResponse}</strong>.
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6">

          {/* GOAL TRACKING */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-3">
            <h2 className="text-xl font-semibold text-(--brand-navy)">Goal Tracking</h2>

            {!goals ? (
              <p className="text-gray-500 text-sm">Loading goals...</p>
            ) : (
              <div className="space-y-4">

                {/* Weekly Applications Goal */}
                <div>
                  <p className="text-gray-600 mb-1">
                    Weekly Applications Goal ({applicationsSent} / {appsGoal})
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-(--brand-sage) h-3 rounded-full"
                      style={{ width: `${appsProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Weekly Interviews Goal */}
                <div>
                  <p className="text-gray-600 mb-1">
                    Weekly Interviews Goal ({interviewsScheduled} / {interviewsGoal})
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-(--brand-sage) h-3 rounded-full"
                      style={{ width: `${interviewsProgress}%` }}
                    ></div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* GOAL EDITOR */}
          <div className="p-5 bg-white shadow rounded-xl border space-y-3">
            <GoalsEditor onUpdate={() => window.location.reload()} />
          </div>
        </div>
      </div>
    </div >
  );
}