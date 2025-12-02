import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import type { PartnerEngagementSummary } from "../../api/jobSearchSharing";
import { fetchPartnerEngagementSummary } from "../../api/jobSearchSharing";

interface Props {
  currentUserId: string;
}

export default function JobSearchPartnerEngagement({ currentUserId }: Props) {
  const [summary, setSummary] = useState<PartnerEngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinceDays, setSinceDays] = useState(30);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPartnerEngagementSummary(currentUserId, sinceDays);
        if (!mounted) return;
        setSummary(data);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error loading partner engagement summary");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId, sinceDays]);

  return (
    <Card className="p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Partner Engagement & Support</h2>
          <p className="text-sm text-gray-600">
            See how actively your accountability partners are engaging with your job search.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Last</span>
          <input
            type="number"
            min={7}
            max={90}
            className="border rounded px-2 py-1 w-16"
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value) || 30)}
          />
          <span>days</span>
        </div>
      </div>

      {loading && <p className="text-sm">Loading engagement…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && !loading && !error && (
        <>
          {/* Overall stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border rounded-md p-3 bg-gray-50">
            <div>
              <div className="font-semibold text-gray-700">Partners</div>
              <div className="text-gray-800">
                {summary.engagedPartners} / {summary.totalPartners}
              </div>
              <div className="text-[11px] text-gray-500">engaged in this window</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Engagements</div>
              <div className="text-gray-800">{summary.totalEvents}</div>
              <div className="text-[11px] text-gray-500">logged interactions</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Goals completed</div>
              <div className="text-gray-800">{summary.goalsCompleted}</div>
              <div className="text-[11px] text-gray-500">in this window</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Milestones</div>
              <div className="text-gray-800">{summary.milestonesAdded}</div>
              <div className="text-[11px] text-gray-500">logged</div>
            </div>
          </div>

          {/* Simple effectiveness text */}
          <p className="text-xs text-gray-600 mt-2">
            In the last {sinceDays} days, your partners engaged{" "}
            <span className="font-semibold">{summary.totalEvents}</span> times. During
            that same period, you completed{" "}
            <span className="font-semibold">{summary.goalsCompleted}</span> goal
            {summary.goalsCompleted === 1 ? "" : "s"} and added{" "}
            <span className="font-semibold">{summary.milestonesAdded}</span>{" "}
            milestone{summary.milestonesAdded === 1 ? "" : "s"}.
          </p>

          {/* Partner table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-1 px-2">Partner</th>
                  <th className="text-right py-1 px-2">Progress views</th>
                  <th className="text-right py-1 px-2">Report views</th>
                  <th className="text-right py-1 px-2">Reactions</th>
                  <th className="text-right py-1 px-2">Level</th>
                  <th className="text-right py-1 px-2">Last active</th>
                </tr>
              </thead>
              <tbody>
                {summary.partners.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-gray-500 py-2 px-2"
                    >
                      No partners configured yet, or no engagement in this period.
                    </td>
                  </tr>
                )}

                {summary.partners.map((p) => (
                  <tr key={p.partnerUserId} className="border-b last:border-0">
                    <td className="py-1 px-2">
                      {/* For now we just show the ID; later you can map this to a name */}
                      <span className="font-mono text-[11px]">
                        {p.partnerUserId}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-right">
                      {p.viewsProgress}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {p.viewsReport}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {p.reactions}
                    </td>
                    <td className="py-1 px-2 text-right capitalize">
                      {p.engagementLevel}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {p.lastEngagedAt
                        ? new Date(p.lastEngagedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
