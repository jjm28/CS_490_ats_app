// src/components/Teams/TeamDashboard.tsx
import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import {
  getTeamGoals,
  getTeamInsights,
  addTeamInsight,
} from "../../api/teams";

interface TeamDashboardProps {
  teamId: string;
}

interface TeamGoal {
  _id?: string;
  teamId: string;
  menteeId: string;
  title: string;
  description?: string;
  targetCount?: number | null;
  currentCount?: number;
  status?: "not-started" | "in-progress" | "completed" | "blocked" | string;
  milestones?: { label: string; completed?: boolean; completedAt?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

interface TeamInsight {
  _id?: string;
  teamId: string;
  menteeId: string;
  text: string;
  source?: string;
  createdAt?: string;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ teamId }) => {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [insights, setInsights] = useState<TeamInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightMenteeId, setNewInsightMenteeId] = useState("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!teamId) return;
      try {
        setLoading(true);
        setError(null);

        // New APIs: both return plain arrays
        const [goalsRes, insightsRes] = await Promise.all([
          getTeamGoals(teamId),
          getTeamInsights(teamId),
        ]);

        // Map backend goal docs -> local TeamGoal shape (userId -> menteeId, etc.)
        const mappedGoals: TeamGoal[] = (goalsRes || []).map((g: any) => ({
          _id: g._id,
          teamId: g.teamId,
          menteeId: g.userId || g.menteeId || "",
          title: g.title,
          description: g.description,
          targetCount:
            typeof g.targetCount === "number" ? g.targetCount : null,
          currentCount:
            typeof g.currentCount === "number" ? g.currentCount : 0,
          status: g.status,
          milestones: g.milestones,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        }));

        // Map backend insight docs -> local TeamInsight shape
        const mappedInsights: TeamInsight[] = (insightsRes || []).map(
          (ins: any) => ({
            _id: ins._id,
            teamId: ins.teamId,
            // backend doesn’t store mentee; keep a fallback so UI has something
            menteeId: ins.menteeId || "general",
            text: ins.text,
            source: ins.source,
            createdAt: ins.createdAt,
          })
        );

        setGoals(mappedGoals);
        setInsights(mappedInsights);
      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
        setError(err?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [teamId]);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const inProgressGoals = goals.filter(
    (g) => g.status === "in-progress" || !g.status
  ).length;
  const blockedGoals = goals.filter((g) => g.status === "blocked").length;

  const recentInsights = insights
    .slice()
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newInsightText.trim();
    if (!text) return;

    try {
      setSavingInsight(true);
      setInsightError(null);

      // If menteeId is left blank, treat it as a general/team-level insight.
      const menteeId = newInsightMenteeId.trim() || "general";

      // New API: addTeamInsight returns the saved insight object directly
      const saved = await addTeamInsight(teamId, menteeId, text, "manual");

      const newInsight: TeamInsight = saved
        ? {
            // whatever backend sends (teamId, text, createdAt, etc.)
            ...(saved as any),
            // ensure our local shape still has menteeId & source for UI
            menteeId,
            source: "manual",
            createdAt:
              (saved as any).createdAt || new Date().toISOString(),
          }
        : {
            teamId,
            menteeId,
            text,
            source: "manual",
            createdAt: new Date().toISOString(),
          };

      // Prepend newest insight to state so it appears immediately
      setInsights((prev) => [newInsight, ...(prev || [])]);

      setNewInsightText("");
      // keep mentee field as-is so you can drop multiple notes for same mentee
    } catch (err: any) {
      console.error("Error adding insight:", err);
      setInsightError(err?.message || "Failed to add insight.");
    } finally {
      setSavingInsight(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* High-level explanation card */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Team Coaching Dashboard
        </h2>
        <p className="text-sm text-gray-600">
          This dashboard allows mentors and mentees to collaborate effectively:
        </p>
        <ul className="list-disc ml-5 text-xs text-gray-700 mt-2 space-y-1">
          <li>View mentee job search progress and activity.</li>
          <li>Send and receive coaching messages.</li>
          <li>Review feedback on resumes and cover letters.</li>
        </ul>
      </Card>

      {/* Tabs guidance card */}
      <Card>
        <p className="text-sm text-gray-600">
          Use the tabs above to switch between <b>Messages</b> and{" "}
          <b>Progress</b>. All communication is shared between mentors and
          mentees in the team.
        </p>
      </Card>

      {/* Coaching Insights + Add Insight */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Coaching Insights
        </h2>
        {loading ? (
          <p className="text-xs text-gray-500">Loading insights…</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : recentInsights.length === 0 ? (
          <p className="text-xs text-gray-500 mb-2">
            No coaching insights have been recorded yet. As you review mentee
            progress, you can add insights or generate them with AI in future
            iterations.
          </p>
        ) : (
          <ul className="text-xs text-gray-700 space-y-2 mb-3">
            {recentInsights.map((insight) => (
              <li
                key={insight._id || `${insight.menteeId}:${insight.text}`}
                className="border border-gray-100 rounded-md px-2 py-1 bg-gray-50"
              >
                <p className="text-gray-800">{insight.text}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Mentee: {insight.menteeId}
                  {insight.source && ` · Source: ${insight.source}`}
                  {insight.createdAt && (
                    <> · {new Date(insight.createdAt).toLocaleString()}</>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Lightweight Add Insight form */}
        <form className="mt-2 space-y-2" onSubmit={handleAddInsight}>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Insight (for interview prep, application strategy, etc.)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                rows={2}
                placeholder="e.g., Focus on showcasing backend projects for FAANG roles, or schedule a mock interview next week."
                value={newInsightText}
                onChange={(e) => setNewInsightText(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Mentee ID (optional)
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="userId/email or leave blank"
                value={newInsightMenteeId}
                onChange={(e) => setNewInsightMenteeId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="bg-teal-600 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
              disabled={savingInsight || !newInsightText.trim()}
            >
              {savingInsight ? "Saving…" : "Add Insight"}
            </button>
            {insightError && (
              <p className="text-[11px] text-red-600">{insightError}</p>
            )}
          </div>
        </form>
      </Card>

      {/* Goals & accountability summary */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Goals &amp; Accountability
        </h2>
        {loading ? (
          <p className="text-xs text-gray-500">Loading goals…</p>
        ) : totalGoals === 0 ? (
          <p className="text-xs text-gray-500">
            No goals have been defined for this team yet. You can start by
            setting targets like &quot;Apply to 10 jobs this month&quot; or
            &quot;Complete 2 mock interviews&quot; per mentee.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-xs text-gray-700 mb-2">
              <div>
                <span className="font-semibold">{totalGoals}</span> total goals
              </div>
              <div>
                <span className="font-semibold text-green-700">
                  {completedGoals}
                </span>{" "}
                completed
              </div>
              <div>
                <span className="font-semibold text-blue-700">
                  {inProgressGoals}
                </span>{" "}
                in progress
              </div>
              <div>
                <span className="font-semibold text-red-700">
                  {blockedGoals}
                </span>{" "}
                blocked
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mb-2">
              Use the Progress tab to drill into each mentee&apos;s KPIs and
              see how they&apos;re progressing toward these goals.
            </p>

            <div className="space-y-2">
              {goals.slice(0, 3).map((g) => {
                const pct =
                  g.targetCount && g.targetCount > 0
                    ? Math.min(
                        100,
                        Math.round(
                          ((g.currentCount || 0) / g.targetCount) * 100
                        )
                      )
                    : null;

                return (
                  <div
                    key={g._id || `${g.menteeId}:${g.title}`}
                    className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                  >
                    <p className="text-xs font-semibold text-gray-900">
                      {g.title}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Mentee: {g.menteeId} · Status:{" "}
                      {g.status || "in-progress"}
                    </p>
                    {pct !== null && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded h-2">
                          <div
                            className="h-2 rounded bg-teal-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {g.currentCount}/{g.targetCount} ({pct}%)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default TeamDashboard;
