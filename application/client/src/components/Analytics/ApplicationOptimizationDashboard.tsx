import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAllJobs } from "../../api/jobs";
import {
  getApplicationMaterialPerformance,
  getApplicationMethodPerformance,
  getApplicationTimingAnalytics
} from "../../api/analytics";

// -----------------------------
// Types
// -----------------------------
interface SuccessMetrics {
  responseRate: number;
  offerRate: number;
  total: number;
}

interface MaterialPerformance {
  versionId: string;
  versionLabel?: string;
  applications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgResponseTimeMs: number | null;
  sufficientSample: boolean;
}

interface ApplicationMaterialAnalytics {
  resumes: MaterialPerformance[];
  coverLetters: MaterialPerformance[];
  resumeGroups: MaterialGroup[];
  coverLetterGroups: MaterialGroup[];
}

interface MaterialGroup {
  baseId: string;
  versions: {
    versionId: string;
    versionLabel?: string;
    applications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  }[];
}

interface ApplicationMethodPerformance {
  method: string;
  applications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

interface ApplicationTimingBucket {
  label: string;
  applications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

interface ApplicationTimingAnalytics {
  byDayOfWeek: ApplicationTimingBucket[];
  byMonth: ApplicationTimingBucket[];
  byDeadlineWindow: ApplicationTimingBucket[];
}

// -----------------------------
// Metrics calculation
// -----------------------------
function computeSuccessMetrics(jobs: any[]): SuccessMetrics {
  const total = jobs.length;

  const responses = jobs.filter(j =>
    ["phone_screen", "interview", "offer", "rejected"].includes(j.status)
  ).length;

  const offers = jobs.filter(j => j.status === "offer").length;

  return {
    responseRate: total ? Math.round((responses / total) * 100) : 0,
    offerRate: total ? Math.round((offers / total) * 100) : 0,
    total,
  };
}

export default function ApplicationOptimizationDashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<
    (SuccessMetrics & { interviewConversion: number }) | null
  >(null);
  const [materials, setMaterials] =
    useState<ApplicationMaterialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [methodPerformance, setMethodPerformance] =
    useState<ApplicationMethodPerformance[]>([]);

  const [timing, setTiming] =
    useState<ApplicationTimingAnalytics | null>(null);

  useEffect(() => {
    async function load() {
      try {
        console.log("🔍 Loading Application Optimization Dashboard");

        const jobs = await getAllJobs();
        setMetrics({
          ...computeSuccessMetrics(jobs),
          interviewConversion: 0, // temp until timing loads
        });

        console.log("📄 Fetching application material analytics");
        const materialData = await getApplicationMaterialPerformance();
        console.log("📊 Material analytics:", materialData);

        setMaterials(materialData);

        console.log("📊 Fetching application method performance");
        const methodData = await getApplicationMethodPerformance();
        setMethodPerformance(methodData);

        // 👇 STEP 5: ADD THIS RIGHT HERE
        console.log("⏱ Fetching application timing analytics");
        const timingData = await getApplicationTimingAnalytics();
        setTiming(timingData);

        // -----------------------------
        // Derive Interview Conversion from Timing Analytics
        // -----------------------------
        const totalApps = timingData.byMonth.reduce(
          (sum: number, b: ApplicationTimingBucket) => sum + b.applications,
          0
        );

        const totalInterviewed = timingData.byMonth.reduce(
          (sum: number, b: ApplicationTimingBucket) =>
            sum + Math.round((b.interviewRate / 100) * b.applications),
          0
        );

        setMetrics(prev =>
          prev
            ? {
              ...prev,
              interviewConversion: totalApps
                ? Math.round((totalInterviewed / totalApps) * 100)
                : 0,
            }
            : null
        );
      } catch (err) {
        console.error("❌ Optimization dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="p-10 space-y-12">

      {/* ================= HEADER ================= */}
      <div className="relative space-y-2">
        <button
          onClick={() => navigate("/analytics/application-success")}
          className="absolute left-0 top-0 inline-flex items-center gap-2 
             px-4 py-2 rounded-lg bg-(--brand-navy) 
             text-white text-sm font-medium
             hover:bg-(--brand-navy-hover) transition"
        >
          ← Back to Analysis
        </button>

        <h1 className="text-3xl font-bold text-(--brand-navy)">
          Application Success Optimization/Material Comparison Dashboard
        </h1>

        <p className="text-gray-600">
          Data-driven insights to improve your application outcomes.
        </p>
      </div>

      {/* ================= METRICS ================= */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <MetricCard
            label="Response Rate"
            value={`${metrics.responseRate}%`}
            sub="Any employer response"
          />
          <MetricCard
            label="Interview Conversion"
            value={`${metrics.interviewConversion}%`}
            sub="Applied → Interview"
          />
          <MetricCard
            label="Offer Rate"
            value={`${metrics.offerRate}%`}
            sub="Offers per application"
          />
        </div>
      )}

      {/* ================= RESUME PERFORMANCE ================= */}
      {materials?.resumes?.length ? (
        <MaterialTable
          title="Resume Version Performance"
          data={materials.resumes}
          type="resume"
        />
      ) : !loading && (
        <EmptyState label="resume versions" />
      )}

      {materials?.resumeGroups?.length && (
        <MaterialGroupTable
          title="Resume Version Groups"
          groups={materials.resumeGroups}
          type="resume"
        />
      )}

      {/* ================= COVER LETTER PERFORMANCE ================= */}
      {materials?.coverLetters?.length ? (
        <MaterialTable
          title="Cover Letter Version Performance"
          data={materials.coverLetters}
          type="cover-letter"
        />
      ) : !loading && (
        <EmptyState label="cover letter versions" />
      )}

      {materials?.coverLetterGroups?.length && (
        <MaterialGroupTable
          title="Cover Letter Version Groups"
          groups={materials.coverLetterGroups}
          type="cover-letter"
        />
      )}

      {/* ================= APPLICATION METHOD ================= */}
      {methodPerformance.length > 0 && (
        <ApplicationMethodTable data={methodPerformance} />
      )}

      {/* ================= TIMING INSIGHTS ================= */}
      {timing && (
        <div className="max-w-5xl mx-auto space-y-10">
          <h2 className="text-2xl font-bold text-(--brand-navy)">
            Application Timing Insights
          </h2>

          <TimingTable title="Best Days to Apply" data={timing.byDayOfWeek} />
          <TimingTable title="Best Months to Apply" data={timing.byMonth} />
          <TimingTable
            title="Timing vs Application Deadline"
            data={timing.byDeadlineWindow}
          />
        </div>
      )}

      {/* ================= TIMING + METHOD RECOMMENDATIONS ================= */}
      {timing && methodPerformance.length > 0 && (
        <TimingMethodRecommendations timing={timing} methods={methodPerformance} />
      )}

    </div>

  );
}

// -----------------------------
// Components
// -----------------------------
function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-(--brand-navy)">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function MaterialTable({
  title,
  data,
  type,
}: {
  title: string;
  data: MaterialPerformance[];
  type: "resume" | "cover-letter";
}) {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-(--brand-navy)">{title}</h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-center">Apps</th>
              <th className="px-4 py-3 text-center">Response %</th>
              <th className="px-4 py-3 text-center">Interview %</th>
              <th className="px-4 py-3 text-center">Offer %</th>
              <th className="px-4 py-3 text-center">Avg Response</th>
            </tr>
          </thead>
          <tbody>
            {data.map(v => (
              <tr key={v.versionId} className="border-t">
                <td className="px-4 py-3 font-medium">
                  <button
                    onClick={() =>
                      navigate(`/analytics/material-usage/${type}/${v.versionId}`)
                    }
                    className="text-blue-600 hover:underline"
                  >
                    {v.versionLabel ?? v.versionId}
                  </button>

                  {!v.sufficientSample && (
                    <span className="ml-2 text-xs text-gray-400">(low sample)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{v.applications}</td>
                <td className="px-4 py-3 text-center">{v.responseRate}%</td>
                <td className="px-4 py-3 text-center">{v.interviewRate}%</td>
                <td className="px-4 py-3 text-center">{v.offerRate}%</td>
                <td className="px-4 py-3 text-center">
                  {v.avgResponseTimeMs ? (() => {
                    const ms = v.avgResponseTimeMs;
                    const days = Math.floor(ms / 86400000);
                    if (days > 0) return `${days}d`;

                    const hours = Math.floor(ms / 3600000);
                    if (hours > 0) return `${hours}h`;

                    const minutes = Math.floor(ms / 60000);
                    return `${Math.max(minutes, 1)}m`;
                  })() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 italic">
        Meaningful comparisons require at least 10 applications per version.
      </p>
    </div>
  );
}

function MaterialGroupTable({
  title,
  groups,
  type
}: {
  title: string;
  groups: MaterialGroup[];
  type: "resume" | "cover-letter";
}) {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-4 mt-12">
      <h2 className="text-2xl font-bold text-(--brand-navy)">
        {title}
      </h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">
                {type === "resume" ? "Resume" : "Cover Letter"}
              </th>
              <th className="px-4 py-3 text-left">Versions</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((g, idx) => (
              <tr key={g.baseId} className="border-t">
                {/* Clickable base material */}
                <td className="px-4 py-3 font-medium">
                  <button
                    onClick={() =>
                      navigate(`/analytics/material-comparison/${type}/${g.baseId}`)
                    }
                    className="text-blue-600 hover:underline"
                  >
                    {type === "resume"
                      ? `Resume ${idx + 1}`
                      : `Cover Letter ${idx + 1}`}
                  </button>
                </td>

                {/* Versions (display only) */}
                <td className="px-4 py-3 text-gray-600">
                  {g.versions
                    .map(v => v.versionLabel ?? v.versionId)
                    .join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="max-w-5xl mx-auto text-center text-sm text-gray-500 italic">
      No {label} have been linked to applications yet.
    </div>
  );
}

function ApplicationMethodTable({
  data,
}: {
  data: ApplicationMethodPerformance[];
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-(--brand-navy)">
        Application Method Effectiveness
      </h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-center">Apps</th>
              <th className="px-4 py-3 text-center">Response %</th>
              <th className="px-4 py-3 text-center">Interview %</th>
              <th className="px-4 py-3 text-center">Offer %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.method} className="border-t">
                <td className="px-4 py-3 font-medium capitalize">
                  {m.method.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3 text-center">{m.applications}</td>
                <td className="px-4 py-3 text-center">{m.responseRate}%</td>
                <td className="px-4 py-3 text-center">{m.interviewRate}%</td>
                <td className="px-4 py-3 text-center">{m.offerRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 italic">
        Meaningful comparisons require at least 10 applications per method.
      </p>
    </div>


  );
}

function TimingTable({
  title,
  data,
}: {
  title: string;
  data: ApplicationTimingBucket[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-(--brand-navy)">
        {title}
      </h3>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Bucket</th>
              <th className="px-4 py-3 text-center">Apps</th>
              <th className="px-4 py-3 text-center">Response %</th>
              <th className="px-4 py-3 text-center">Interview %</th>
              <th className="px-4 py-3 text-center">Offer %</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.label} className="border-t">
                <td className="px-4 py-3 font-medium">{b.label}</td>
                <td className="px-4 py-3 text-center">{b.applications}</td>
                <td className="px-4 py-3 text-center">{b.responseRate}%</td>
                <td className="px-4 py-3 text-center">{b.interviewRate}%</td>
                <td className="px-4 py-3 text-center">{b.offerRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimingMethodRecommendations({
  timing,
  methods,
}: {
  timing: ApplicationTimingAnalytics;
  methods: ApplicationMethodPerformance[];
}) {
  const bestDay = timing.byDayOfWeek
    .filter(b => b.applications > 0)
    .sort((a, b) => b.offerRate - a.offerRate)[0];

  const bestMonth = timing.byMonth
    .filter(b => b.applications > 0)
    .sort((a, b) => b.offerRate - a.offerRate)[0];

  const bestDeadlineWindow = timing.byDeadlineWindow
    .filter(b => b.applications > 0)
    .sort((a, b) => b.offerRate - a.offerRate)[0];

  const bestMethod = [...methods]
    .filter(m => m.applications > 0)
    .sort((a, b) => b.offerRate - a.offerRate)[0];

  return (
    <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-bold text-(--brand-navy)">
        Actionable Recommendations
      </h2>

      <div className="text-sm text-gray-700 space-y-2">
        {bestDay && (
          <p>
            📅 Your strongest results occur when applying on{" "}
            <span className="font-semibold">{bestDay.label}</span>.
            Prioritize applications on this day whenever possible.
          </p>
        )}

        {bestMonth && (
          <p>
            📆 Applications submitted in{" "}
            <span className="font-semibold">{bestMonth.label}</span>{" "}
            show your highest success rate. Increase activity during this month.
          </p>
        )}

        {bestDeadlineWindow && (
          <p>
            ⏱ Applying{" "}
            <span className="font-semibold">
              {bestDeadlineWindow.label}
            </span>{" "}
            yields the strongest outcomes. Time submissions accordingly.
          </p>
        )}

        {bestMethod && (
          <p>
            🚀 Your highest-performing application method is{" "}
            <span className="font-semibold capitalize">
              {bestMethod.method.replaceAll("_", " ")}
            </span>.
            Focus your effort on this channel.
          </p>
        )}
      </div>
    </div>
  );
}