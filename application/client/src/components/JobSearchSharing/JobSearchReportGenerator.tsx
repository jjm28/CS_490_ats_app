import React, { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type { JobSearchProgressReport } from "../../api/jobSearchSharing";
import { generateProgressReportApi } from "../../api/jobSearchSharing";

interface Props {
  currentUserId: string;
}

export default function JobSearchReportGenerator({ currentUserId }: Props) {
  const [report, setReport] = useState<JobSearchProgressReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // optional: date range controls
  const [daysBack, setDaysBack] = useState(7);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(null);

      const now = new Date();
      const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      const data = await generateProgressReportApi({
        ownerId: currentUserId,
        viewerId: currentUserId, // owner viewing own report
        rangeFrom: from.toISOString(),
        rangeTo: now.toISOString(),
      });

      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error generating report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Progress Report</h2>
      </div>

      <p className="text-sm text-gray-600">
        Generate a summary of your recent job search activity to share with your accountability partners.
      </p>

      {/* Range control */}
      <div className="flex items-center gap-2 text-sm">
        <span>Last</span>
        <input
          type="number"
          min={1}
          max={60}
          className="border rounded px-2 py-1 w-16"
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value) || 7)}
        />
        <span>days</span>

        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate report"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Report preview */}
      {report && (
        <div className="border rounded-md p-3 space-y-3 mt-2 text-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">
                Report ({new Date(report.range.from).toLocaleDateString()} –{" "}
                {new Date(report.range.to).toLocaleDateString()})
              </h3>
              <p className="text-xs text-gray-500">
                Generated at {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Goals summary */}
          {report.goalsSummary.length > 0 && (
            <section className="space-y-1">
              <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500">
                Goals
              </h4>
              <div className="space-y-1">
                {report.goalsSummary.map((g) => (
                  <div key={g.id} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-xs text-gray-600">
                        {g.currentValue} / {g.targetValue} {g.unit} ({g.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-500"
                        style={{ width: `${g.percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      Status: {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Milestones */}
          {report.milestones.length > 0 && (
            <section className="space-y-1">
              <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500">
                Milestones
              </h4>
              <div className="space-y-1">
                {report.milestones.map((m) => (
                  <div key={m.id} className="flex justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-gray-600">
                          {m.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.achievedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activity summary (stub) */}
          {report.activitySummary && (
            <section className="space-y-1">
              <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500">
                Activity
              </h4>
              {/* Render your activity fields when you add them */}
            </section>
          )}

          {/* Insights */}
          {report.insights.length > 0 && (
            <section className="space-y-1">
              <h4 className="font-medium text-xs uppercase tracking-wide text-gray-500">
                Insights
              </h4>
              <ul className="list-disc pl-5 space-y-0.5">
                {report.insights.map((line, idx) => (
                  <li key={idx} className="text-xs text-gray-700">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Future: buttons for sending to partners, copying link, etc. */}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary">
              Send to partners (coming soon)
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
