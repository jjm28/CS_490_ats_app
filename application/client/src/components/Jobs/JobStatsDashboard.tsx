import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJobStats } from "../../api/jobs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";

const JobStatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getJobStats();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="p-6">Loading statistics...</p>;
  if (!stats) return <p className="p-6 text-red-600">Failed to load statistics.</p>;

  // 🧠 Transform monthlyCounts into chart-friendly format
  const monthlyData = Object.entries(stats.monthlyCounts || {}).map(
    ([month, count]) => ({
      month,
      count,
    })
  );

  // Sort months by date
  monthlyData.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Button onClick={() => navigate("/Jobs")} className="mb-2">
        ← Back to Jobs
      </Button>

      <Card>
        <h1 className="text-2xl font-bold mb-4">Job Statistics & Analytics</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-500">Total Active Jobs</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Response Rate</p>
            <p className="text-2xl font-semibold text-blue-600">
              {stats.responseRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Time to Offer</p>
            <p className="text-2xl font-semibold text-green-600">
              {stats.avgOfferTime} days
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deadline Adherence</p>
            <p className="text-2xl font-semibold text-indigo-600">
              {stats.deadlineAdherence}%
            </p>
          </div>
        </div>

        {/* Jobs by Status */}
        <h2 className="font-semibold mb-2">Jobs by Status</h2>
        <ul className="list-disc ml-5 text-sm text-gray-700">
          {Object.entries(stats.byStatus || {}).map(([status, count]) => (
            <li key={status}>
              {status.replace("_", " ")}: {count as number}
            </li>
          ))}
        </ul>

        {/* Monthly Applications Section */}
        <h2 className="font-semibold mt-6 mb-3">📅 Monthly Applications</h2>

        {monthlyData.length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [`${value} Applications`, "Count"]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500 ml-1">
            No monthly application data available yet.
          </p>
        )}
      </Card>
    </div>
  );
};

export default JobStatsDashboard;