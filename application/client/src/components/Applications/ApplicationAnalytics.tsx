import React, { useEffect, useState, useMemo } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Job {
  _id: string;
  company: string;
  industry?: string;
  status: string;
  type?: string;
  createdAt?: string;
  statusHistory?: { status: string; timestamp: string }[];
}

const ApplicationAnalytics: React.FC = () => {
  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();
      setJobs(data);
    } catch (error: any) {
      setErr(error.message || "Error fetching analytics data");
    } finally {
      setLoading(false);
    }
  };

  // --- Main stats
  const total = jobs.length || 1;
  const interviewReached = jobs.filter((j) =>
    j.statusHistory?.some((s) => s.status === "interview")
  ).length;
  const offerReached = jobs.filter((j) =>
    j.statusHistory?.some((s) => s.status === "offer")
  ).length;

  const interviewRate = ((interviewReached / total) * 100).toFixed(1);
  const successRate = ((offerReached / total) * 100).toFixed(1);

  // --- Average response time (applied → next stage)
  const avgResponseTime = (() => {
    const diffs: number[] = [];
    jobs.forEach((job) => {
      if (!job.statusHistory) return;
      const sorted = [...job.statusHistory].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const appliedIndex = sorted.findIndex((s) => s.status === "applied");
      if (appliedIndex === -1 || appliedIndex === sorted.length - 1) return;
      const next = sorted[appliedIndex + 1];
      const diff =
        (new Date(next.timestamp).getTime() -
          new Date(sorted[appliedIndex].timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff > 0) diffs.push(diff);
    });
    return diffs.length
      ? (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)
      : "—";
  })();

  // --- Offer Success by Month
  const successByMonth = useMemo(() => {
    const counts: Record<string, { total: number; offers: number }> = {};
    jobs.forEach((job) => {
      if (!job.createdAt) return;
      const month = new Date(job.createdAt).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      counts[month] = counts[month] || { total: 0, offers: 0 };
      counts[month].total += 1;
      if (job.statusHistory?.some((s) => s.status === "offer"))
        counts[month].offers += 1;
    });
    return Object.entries(counts).map(([month, { total, offers }]) => ({
      month,
      successRate: total > 0 ? (offers / total) * 100 : 0,
    }));
  }, [jobs]);

  const bestMonth =
    successByMonth.length > 0
      ? successByMonth.reduce((best, curr) =>
          curr.successRate > best.successRate ? curr : best
        ).month
      : "N/A";

  // --- Success Rate by Application Approach
  const approachStats = useMemo(() => {
    const methods = [...new Set(jobs.map((j) => j.type || "Other"))];
    return methods.map((method) => {
      const subset = jobs.filter((j) => (j.type || "Other") === method);
      const total = subset.length;
      const offers = subset.filter((j) =>
        j.statusHistory?.some((s) => s.status === "offer")
      ).length;
      return {
        method,
        successRate: total > 0 ? ((offers / total) * 100).toFixed(1) : "0",
      };
    });
  }, [jobs]);

  // --- Application Volume & Frequency
  const monthlyData = (() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      if (j.createdAt) {
        const month = new Date(j.createdAt).toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    let cumulative = 0;
    return Object.entries(counts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, count]) => {
        cumulative += count;
        return { month, count, cumulative };
      });
  })();

  // --- Leaderboard Calculation
  const calculateResponseTimeLeaderboard = (
    jobs: Job[],
    key: "company" | "industry"
  ) => {
    const groups: Record<string, number[]> = {};

    jobs.forEach((job) => {
      if (!job.statusHistory || job.statusHistory.length === 0) return;

      const sorted = [...job.statusHistory].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const appliedIndex = sorted.findIndex((s) => s.status === "applied");
      if (appliedIndex === -1 || appliedIndex === sorted.length - 1) return;

      const applied = sorted[appliedIndex];
      const next = sorted[appliedIndex + 1];
      const diff =
        (new Date(next.timestamp).getTime() -
          new Date(applied.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diff > 0) {
        const groupKey = job[key] || "Other";
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(diff);
      }
    });

    return Object.entries(groups)
      .map(([name, diffs]) => ({
        name,
        avgResponse: parseFloat(
          (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)
        ),
      }))
      .sort((a, b) => a.avgResponse - b.avgResponse);
  };

  const companyResponseLeaderboard = useMemo(
    () => calculateResponseTimeLeaderboard(jobs, "company"),
    [jobs]
  );
  const industryResponseLeaderboard = useMemo(
    () => calculateResponseTimeLeaderboard(jobs, "industry"),
    [jobs]
  );

  // --- Funnel
  const funnelData = [
    { stage: "Applied", count: jobs.filter((j) => j.statusHistory?.some((s) => s.status === "applied")).length },
    { stage: "Phone Screen", count: jobs.filter((j) => j.statusHistory?.some((s) => s.status === "phone_screen")).length },
    { stage: "Interview", count: jobs.filter((j) => j.statusHistory?.some((s) => s.status === "interview")).length },
    { stage: "Offer", count: jobs.filter((j) => j.statusHistory?.some((s) => s.status === "offer")).length },
  ];

  // --- Industry Breakdown
  const industryData = [
    ...new Set(jobs.map((j) => j.industry || "Other")),
  ].map((ind) => ({
    industry: ind,
    count: jobs.filter((j) => j.industry === ind).length,
  }));

  // --- Dynamic Optimization Recommendations
  const topApproach = [...approachStats].sort(
    (a, b) => Number(b.successRate) - Number(a.successRate)
  )[0];
  const topCompany = companyResponseLeaderboard[0];
  const topIndustry = industryResponseLeaderboard[0];
  const topMonth = [...successByMonth].sort(
    (a, b) => b.successRate - a.successRate
  )[0];

  const recommendations = [
    topApproach &&
      `Try focusing more on ${topApproach.method.toLowerCase()} roles — they show your best success rate (${topApproach.successRate}%).`,
    topCompany &&
      `Companies like ${topCompany.name} are highly responsive (avg ${topCompany.avgResponse} days). Follow up sooner with similar companies.`,
    topIndustry &&
      `The ${topIndustry.name} industry responds the quickest (${topIndustry.avgResponse} days). Target similar sectors for faster outcomes.`,
    topMonth &&
      `Your strongest offer activity was in ${topMonth.month}. Plan your next major application push around that time.`,
  ].filter(Boolean);

  // --- Goal Setting and Progress Tracking
  const goals = [
    {
      title: "Monthly Applications",
      target: 10,
      current: jobs.filter((j) => {
        const created = new Date(j.createdAt || "");
        return created.getMonth() === new Date().getMonth();
      }).length,
    },
    {
      title: "Interviews This Month",
      target: 5,
      current: jobs.filter((j) =>
        j.statusHistory?.some(
          (s) =>
            s.status === "interview" &&
            new Date(s.timestamp).getMonth() === new Date().getMonth()
        )
      ).length,
    },
    {
      title: "Offers This Semester",
      target: 3,
      current: jobs.filter((j) =>
        j.statusHistory?.some((s) => s.status === "offer")
      ).length,
    },
  ];

  const handleExport = () => {
    const csv = [
      ["Company", "Industry", "Status", "CreatedAt"].join(","),
      ...jobs.map((j) =>
        [j.company, j.industry || "", j.status, j.createdAt || ""].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "application_analytics.csv";
    link.click();
  };

  if (loading) return <p className="p-6">Loading analytics...</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        📊 Application Analytics Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-blue-600">{successRate}%</p>
          <p className="text-gray-600">Offer Success Rate</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-yellow-600">{interviewRate}%</p>
          <p className="text-gray-600">Interview Rate</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-green-600">{avgResponseTime} days</p>
          <p className="text-gray-600">Avg Response Time</p>
        </div>
      </div>

      {/* Success Rate by Application Approach */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-10 border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Success Rate by Application Approach
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={approachStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="successRate" fill="#60a5fa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Response Time Leaderboard */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-10 border">
        <h2 className="text-xl font-semibold mb-1 text-gray-800">
          ⏱ Fastest Response Times by Company
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          (Average days from application to first recruiter response)
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-700">
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Avg Response (Days)</th>
              </tr>
            </thead>
            <tbody>
              {companyResponseLeaderboard.slice(0, 5).map((item, idx) => (
                <tr
                  key={item.name}
                  className={`border-b ${
                    idx === 0
                      ? "bg-green-50"
                      : idx === 1
                      ? "bg-blue-50"
                      : idx === 2
                      ? "bg-yellow-50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2 font-medium">#{idx + 1}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.avgResponse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold mb-1 text-gray-800">
          🏭 Fastest Response Times by Industry
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          (Average days from application to first recruiter response)
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-700">
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Industry</th>
                <th className="px-4 py-2">Avg Response (Days)</th>
              </tr>
            </thead>
            <tbody>
              {industryResponseLeaderboard.slice(0, 5).map((item, idx) => (
                <tr
                  key={item.name}
                  className={`border-b ${
                    idx === 0
                      ? "bg-green-50"
                      : idx === 1
                      ? "bg-blue-50"
                      : idx === 2
                      ? "bg-yellow-50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2 font-medium">#{idx + 1}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.avgResponse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Volume & Frequency */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-10 border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Application Volume & Frequency
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#34d399"
              strokeWidth={2}
              name="Applications Sent"
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#60a5fa"
              strokeWidth={2}
              name="Cumulative Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Industry Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-10 border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Applications by Industry
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={industryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="industry" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Optimization Recommendations */}
      <div className="bg-gray-50 border rounded-xl p-5 shadow-sm mb-10 text-sm text-gray-700">
        <h2 className="text-lg font-semibold mb-2">
          💡 Optimization Recommendations
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          {recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Goal Setting and Progress Tracking */}
      <div className="bg-white border rounded-xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">📈 Goal Progress Tracker</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {goals.map((goal, idx) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div
                key={idx}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center shadow-sm"
              >
                <p className="text-sm text-gray-600 mb-2">{goal.title}</p>
                <p className="text-2xl font-bold text-indigo-600 mb-1">
                  {goal.current} / {goal.target}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      progress >= 100 ? "bg-green-500" : "bg-indigo-400"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {progress >= 100
                    ? "🎯 Goal achieved!"
                    : `${progress.toFixed(0)}% complete`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="primary" onClick={handleExport}>
          Export CSV
        </Button>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default ApplicationAnalytics;