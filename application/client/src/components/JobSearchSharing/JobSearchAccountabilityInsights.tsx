import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import type { AccountabilityInsights } from "../../api/jobSearchSharing";
import { fetchAccountabilityInsights } from "../../api/jobSearchSharing";

interface Props {
  currentUserId: string;
}

export default function JobSearchAccountabilityInsights({ currentUserId }: Props) {
  const [sinceWeeks, setSinceWeeks] = useState(8);
  const [data, setData] = useState<AccountabilityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchAccountabilityInsights(currentUserId, sinceWeeks);
        if (!mounted) return;
        setData(resp);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error loading accountability insights");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId, sinceWeeks]);

  return (
    <Card className="p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Accountability Insights</h2>
          <p className="text-sm text-gray-600">
            See how partner engagement aligns with your job search activity and goal completion.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Last</span>
          <input
            type="number"
            min={4}
            max={24}
            className="border rounded px-2 py-1 w-16"
            value={sinceWeeks}
            onChange={(e) => setSinceWeeks(Number(e.target.value) || 8)}
          />
          <span>weeks</span>
        </div>
      </div>

      {loading && <p className="text-sm">Analyzing accountability impact…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && !loading && !error && (
        <>
          {/* Headline */}
          <div className="border rounded-md p-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              {data.headline}
            </p>
          </div>

          {/* High vs zero engagement comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="border rounded-md p-3">
              <div className="font-semibold text-gray-700 mb-1">
                High-engagement weeks
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                Weeks with at least{" "}
                {data.highEngagementDefinition.minEventsPerWeek} partner
                engagement events.
              </p>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">Count: </span>
                  <span>{data.stats.highEngagementWeeks}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Avg actions:
                  </span>{" "}
                  <span>{data.stats.avgActionsHigh.toFixed(1)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Avg goals completed:
                  </span>{" "}
                  <span>{data.stats.avgGoalsHigh.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="font-semibold text-gray-700 mb-1">
                No-engagement weeks
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                Weeks with zero partner engagement events.
              </p>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">Count: </span>
                  <span>{data.stats.zeroEngagementWeeks}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Avg actions:
                  </span>{" "}
                  <span>{data.stats.avgActionsZero.toFixed(1)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Avg goals completed:
                  </span>{" "}
                  <span>{data.stats.avgGoalsZero.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Narrative insights */}
          {data.insights && data.insights.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Key observations
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                {data.insights.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Top partners */}
          {data.topPartners && data.topPartners.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Most engaged partners
              </h3>
              <ul className="space-y-1 text-xs text-gray-700">
                {data.topPartners.map((p) => (
                  <li key={p.partnerUserId}>
                    <span className="font-mono text-[11px]">
                      {p.partnerUserId}
                    </span>{" "}
                    – {p.engagementLevel} engagement ({p.totalEvents}{" "}
                    event{p.totalEvents === 1 ? "" : "s"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {data.suggestions && data.suggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Suggestions
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                {data.suggestions.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI hook (optional, future) */}
          <p className="text-[10px] text-gray-400 mt-2">
            Summary ready for AI analysis (not wired yet):{" "}
            <span className="font-mono">
              {data.summaryForAi.slice(0, 120)}…
            </span>
          </p>
        </>
      )}
    </Card>
  );
}
