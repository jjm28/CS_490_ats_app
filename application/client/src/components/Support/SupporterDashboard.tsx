import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../StyledComponents/Card";
import API_BASE from "../../utils/apiBase";
import type { SupporterSummaryPayload, SupportGuidance,    MilestoneSummary, } from "../../types/support.types";

const SUPPORTERS_ENDPOINT = `${API_BASE}/api/supporters`;

export default function SupporterDashboard() {
  const { supporterId } = useParams<{ supporterId: string }>();

  const [data, setData] = useState<SupporterSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supporterId) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${SUPPORTERS_ENDPOINT}/${supporterId}/summary`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load summary");
        }
        const payload: SupporterSummaryPayload = await res.json();
        setData(payload);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [supporterId]);

  if (!supporterId) {
    return (
      <div className="text-sm text-gray-600">
        No supporter selected in the URL.
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-sm text-red-500">
        {error || "Unable to load supporter summary"}
      </div>
    );
  }

  const { supporter, summary } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="p-4">
        <h1 className="font-semibold text-lg">
          Supporting {supporter.fullName} ({supporter.relationship})
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          This page shows a privacy-safe view of their job search so you can be
          supportive without needing all the sensitive details.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-2">Job search snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <SummaryStat
            label="Total applications"
            value={summary.progressSummary.totalApplications}
          />
          <SummaryStat
            label="This week"
            value={summary.progressSummary.applicationsThisWeek}
          />
          <SummaryStat
            label="Interviews"
            value={summary.progressSummary.interviewsScheduled}
          />
          <SummaryStat
            label="Offers"
            value={summary.progressSummary.offers}
          />
        </div>
        <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-4">
          <div>
            <span className="font-semibold">Current focus:</span>{" "}
            {summary.progressSummary.statusTrend}
          </div>
          <div>
            <span className="font-semibold">Consistency:</span>{" "}
            {summary.progressSummary.consistencyScore}/100
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-2">Upcoming interview</h2>
        {summary.upcomingInterview ? (
          summary.upcomingInterview.message ? (
            <p className="text-xs text-gray-700">
              {summary.upcomingInterview.message}
            </p>
          ) : (
            <div className="text-xs text-gray-700">
              <div>
                <span className="font-semibold">When:</span>{" "}
                {summary.upcomingInterview.date
                  ? new Date(
                      summary.upcomingInterview.date
                    ).toLocaleString()
                  : "Soon"}
              </div>
              {summary.upcomingInterview.company && (
                <div>
                  <span className="font-semibold">Company:</span>{" "}
                  {summary.upcomingInterview.company}
                </div>
              )}
              {summary.upcomingInterview.jobTitle && (
                <div>
                  <span className="font-semibold">Role:</span>{" "}
                  {summary.upcomingInterview.jobTitle}
                </div>
              )}
            </div>
          )
        ) : (
          <p className="text-xs text-gray-600">
            No upcoming interviews currently visible.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-2">Recent activity</h2>
        {summary.recentActivity.length === 0 ? (
          <p className="text-xs text-gray-600">
            No recent updates are available yet.
          </p>
        ) : (
          <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
            {summary.recentActivity.map((item, idx) => (
              <div
                key={idx}
                className="border rounded px-2 py-1 flex justify-between"
              >
                <div>
                  <div className="font-medium">{item.title}</div>
                  {item.company && (
                    <div className="text-gray-600">{item.company}</div>
                  )}
                  <div className="text-[10px] text-gray-500">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 uppercase">
                  {item.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-2">Well-being overview</h2>
        {summary.wellbeing ? (
          <div className="text-xs text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">Stress:</span>{" "}
              <span className="capitalize">
                {summary.wellbeing.stressLevelLabel}
              </span>{" "}
              ({summary.wellbeing.stressScore.toFixed(1)}/5)
            </p>
            <p>
              <span className="font-semibold">Mood:</span>{" "}
              <span className="capitalize">
                {summary.wellbeing.moodLabel}
              </span>{" "}
              ({summary.wellbeing.moodScore.toFixed(1)}/5)
            </p>
            <p>
              <span className="font-semibold">Trend:</span>{" "}
              <span className="capitalize">
                {summary.wellbeing.trend}
              </span>
            </p>
            {summary.wellbeing.lastUpdatedAt && (
              <p className="text-[10px] text-gray-500">
                Last updated{" "}
                {new Date(
                  summary.wellbeing.lastUpdatedAt
                ).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            They&apos;re not sharing well-being details with supporters right
            now, or there&apos;s not enough data yet.
          </p>
        )}
      </Card>
            <SupporterGuidanceCard guidance={summary.guidance || null} />
                  <MilestonesCard milestones={summary.milestones || []} />


    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded px-3 py-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}


function SupporterGuidanceCard({ guidance }: { guidance: any }) {
  if (!guidance) {
    return (
      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-2">
          How you can support them
        </h2>
        <p className="text-xs text-gray-600">
          Guidance isn&apos;t available right now, but you can always ask them
          directly how they&apos;d like to be supported.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-sm mb-1">
          How you can support them this week
        </h2>
        <p className="text-xs text-gray-700 font-medium">
          {guidance.headline}
        </p>
        {guidance.summary && (
          <p className="text-xs text-gray-600 mt-1">{guidance.summary}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        <div>
          <div className="font-semibold mb-1">Helpful things you can do</div>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {guidance.supportTips?.map((tip: string, idx: number) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-1">
            Things to avoid (based on their preferences)
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {guidance.thingsToAvoid?.map((tip: string, idx: number) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

{guidance.resources && guidance.resources.length > 0 && (
  <div>
    <div className="font-semibold text-xs mb-1">Want to learn more?</div>
    <ul className="text-xs space-y-1">
      {guidance.resources.map(
        (r: { slug: string; title: string; category: string; url?: string }, idx: number) => (
          <li key={idx}>
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                {r.title}
              </a>
            ) : (
              <span className="text-gray-700">{r.title}</span>
            )}
          </li>
        )
      )}
    </ul>
  </div>
)}

    </Card>
  );
}


function MilestonesCard({ milestones }: { milestones: MilestoneSummary[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold text-sm mb-2">Recent wins &amp; milestones</h2>
      {(!milestones || milestones.length === 0) ? (
        <p className="text-xs text-gray-600">
          When they choose to share celebrations with you, they&apos;ll appear here.
        </p>
      ) : (
        <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="border rounded px-3 py-2 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{m.title}</div>
                <div className="text-[10px] text-gray-500">
                  {new Date(m.createdAt).toLocaleDateString()}
                </div>
              </div>
              {m.message && (
                <div className="text-gray-700">{m.message}</div>
              )}
              {(m.jobCompany || m.jobTitle) && (
                <div className="text-[11px] text-gray-600">
                  {m.jobTitle && <span>{m.jobTitle}</span>}
                  {m.jobTitle && m.jobCompany && <span> @ </span>}
                  {m.jobCompany && <span>{m.jobCompany}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
