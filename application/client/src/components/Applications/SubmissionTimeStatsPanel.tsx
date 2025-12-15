// src/components/Applications/SubmissionTimeStatsPanel.tsx
import React, { useMemo } from "react";
import type { SubmissionTimeStats } from "../../api/applicationScheduler";

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function fmtDays(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export default function SubmissionTimeStatsPanel(props: { stats: SubmissionTimeStats | null }) {
  const stats = props.stats;

  const totalApplications = stats?.totalApplications ?? 0;
  const avgDaysEarly = stats?.avgDaysEarly ?? 0;
  const bestTimeWindow = stats?.bestTimeWindow ?? "—";
  const responseSuccessRate = stats?.responseSuccessRate ?? 0;

  const byWindowRows = useMemo(() => {
    const map = stats?.responseByWindow || {};
    const rows = Object.entries(map).map(([label, v]) => ({
      label,
      total: v?.total ?? 0,
      successful: v?.successful ?? 0,
      successRate: v?.successRate ?? 0,
    }));

    // stable ordering (most useful first)
    const order = [
      "Morning (5am–12pm)",
      "Afternoon (12pm–5pm)",
      "Evening (5pm–9pm)",
      "Night (9pm–5am)",
    ];

    rows.sort((a, b) => {
      const ia = order.indexOf(a.label);
      const ib = order.indexOf(b.label);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.label.localeCompare(b.label);
    });

    return rows;
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-md border p-3 text-center">
          <div className="text-xs text-gray-600">Total Applications</div>
          <div className="text-lg font-semibold">{totalApplications}</div>
        </div>

        <div className="rounded-md border p-3 text-center">
          <div className="text-xs text-gray-600">Avg submitted early</div>
          <div className="text-lg font-semibold">{fmtDays(avgDaysEarly)} days</div>
        </div>

        <div className="rounded-md border p-3 text-center">
          <div className="text-xs text-gray-600">Best time window</div>
          <div className="text-base font-semibold">{bestTimeWindow}</div>
        </div>

        <div className="rounded-md border p-3 text-center">
          <div className="text-xs text-gray-600">Response success rate</div>
          <div className="text-lg font-semibold">{fmtPct(responseSuccessRate)}</div>
          <div className="mt-1 text-[11px] text-gray-500">
            Successful = Phone Screen / Interview / Offer
          </div>
        </div>
      </div>

      {/* By-window breakdown */}
      <div className="rounded-md border p-3">
        <div className="text-sm font-semibold text-gray-900 mb-2">
          Successful outcomes by time window
        </div>

        {byWindowRows.length === 0 ? (
          <div className="text-sm text-gray-600">
            No submitted applications found yet (or missing submittedAt). Submit at least one scheduled item to populate stats.
          </div>
        ) : (
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Time window</th>
                  <th className="text-right px-3 py-2">Submitted</th>
                  <th className="text-right px-3 py-2">Successful</th>
                  <th className="text-right px-3 py-2">Success rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byWindowRows.map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2 text-right">{r.total}</td>
                    <td className="px-3 py-2 text-right">{r.successful}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(r.successRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
