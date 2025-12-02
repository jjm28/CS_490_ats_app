import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import type {
  MotivationStats,
  DailyActivitySample,
} from "../../api/jobSearchSharing";
import { fetchMotivationStats } from "../../api/jobSearchSharing";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  ownerUserId: string;   // whose job search stats
  viewerUserId: string;  // who is looking at it (owner or partner)
  refreshKey?: number;
}

export default function JobSearchMotivationPanel({
  ownerUserId,
  viewerUserId,
  refreshKey,
}: Props) {

  const [stats, setStats] = useState<MotivationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinceDays, setSinceDays] = useState(14);

useEffect(() => {
  let mounted = true;

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMotivationStats(
        ownerUserId,
        sinceDays,
        viewerUserId
      );
      if (!mounted) return;
      setStats(data);
    } catch (err: any) {
      console.error(err);
      if (!mounted) return;
      setError(err.message || "Error loading motivation stats");
    } finally {
      if (mounted) setLoading(false);
    }
  }

  load();
  return () => {
    mounted = false;
  };
}, [ownerUserId, viewerUserId, sinceDays, refreshKey]);


const renderChart = (daily: DailyActivitySample[]) => {
  if (!daily || daily.length === 0) return null;

  const totalActions = daily.reduce(
    (sum, d) => sum + d.totalActions,
    0
  );

  const max = daily.reduce(
    (m, d) => (d.totalActions > m ? d.totalActions : m),
    0
  );

  if (max === 0) {
    return (
      <p className="text-xs text-gray-500 mt-2">
        No activity yet in this window. Your first action will show up here.
      </p>
    );
  }

  // Build chart data – keep full date but label as MM-DD on x-axis
  const data = daily.map((d) => {
    const [year, month, day] = d.dayKey.split("-");
    return {
      date: d.dayKey,
      label: `${month}-${day}`,
      actions: d.totalActions,
    };
  });

  // make width depend on number of days so bars are not too cramped
  const chartWidth = Math.max(800, data.length * 24); // px

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-500">
          Total actions: {totalActions}
        </span>
        <span className="text-[11px] text-gray-500">
          Max in a day: {max}
        </span>
      </div>

      {/* fixed-height area with horizontal scroll if needed */}
      <div className="h-40 w-full border-b border-gray-200 pb-1 overflow-x-auto">
        <BarChart
          width={chartWidth}
          height={150}
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value: any) => [`${value} action(s)`, "Activity"]}
            labelFormatter={(label: any, payload: any) => {
              const p = payload && payload[0];
              return p && p.payload ? p.payload.date : label;
            }}
          />
          <Bar
            dataKey="actions"
            fill="#16a34a" // bright green
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{daily[0].dayKey}</span>
        <span>{daily[daily.length - 1].dayKey}</span>
      </div>
    </div>
  );
};




  return (
    <Card className="p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Motivation & Visual Progress</h2>
          <p className="text-sm text-gray-600">
            See your streaks and activity over time to stay motivated.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Last</span>
          <input
            type="number"
            min={7}
            max={60}
            className="border rounded px-2 py-1 w-16"
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value) || 14)}
          />
          <span>days</span>
        </div>
      </div>

      {loading && <p className="text-sm">Loading motivation data…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && !loading && !error && (
        <>
          {/* Streak + goals snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border rounded-md p-3 bg-gray-50">
            <div>
              <div className="font-semibold text-gray-700">Current streak</div>
              <div className="text-gray-900 text-base">
                {stats.currentStreak} day
                {stats.currentStreak === 1 ? "" : "s"}
              </div>
              <div className="text-[11px] text-gray-500">
                consecutive days with action
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Longest streak</div>
              <div className="text-gray-900 text-base">
                {stats.longestStreak} day
                {stats.longestStreak === 1 ? "" : "s"}
              </div>
              <div className="text-[11px] text-gray-500">
                in the last 90 days
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">
                Completed goals
              </div>
              <div className="text-gray-900 text-base">
                {stats.completedGoals} / {stats.totalGoals}
              </div>
              <div className="text-[11px] text-gray-500">
                total goals completed
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">
                Completion rate
              </div>
              <div className="text-gray-900 text-base">
                {stats.completionRate}%
              </div>
              <div className="text-[11px] text-gray-500">
                of all goals created
              </div>
            </div>
          </div>

          {/* Activity chart */}
          <div className="mt-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Activity timeline
              </h3>
              <span className="text-[11px] text-gray-500">
                Actions per day
              </span>
            </div>
            {renderChart(stats.dailyActivity)}
          </div>

          {/* Motivational messages */}
          {stats.messages && stats.messages.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Motivation
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                {stats.messages.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
