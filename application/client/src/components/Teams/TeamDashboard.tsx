// src/components/Teams/TeamDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import {
  getTeamGoals,
  getTeamInsights,
  addTeamInsight,
} from "../../api/teams";

interface TeamDashboardProps {
  teamId: string;
  // Role awareness from parent (e.g., TeamDetailPage)
  viewerRoles?: string[];
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

interface Insight {
  _id?: string;
  teamId: string;
  text: string;
  source?: string;
  createdAt?: string;
  scope?: "team" | "personal";
  authorName?: string;
  recipientIds?: string[];
}

interface MemberLite {
  id: string;
  name: string;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({
  teamId,
  viewerRoles = [],
}) => {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [teamInsights, setTeamInsights] = useState<Insight[]>([]);
  const [personalInsights, setPersonalInsights] = useState<Insight[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [canPost, setCanPost] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [newText, setNewText] = useState("");
  const [scope, setScope] = useState<"team" | "personal">("team");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const isAdminOrMentor =
    viewerRoles.includes("admin") || viewerRoles.includes("mentor");
  const isCandidateOnly =
    viewerRoles.includes("candidate") && !isAdminOrMentor;

  useEffect(() => {
    const load = async () => {
      if (!teamId) return;
      try {
        setLoading(true);
        setError(null);

        const [goalsRes, insightsRes] = await Promise.all([
          getTeamGoals(teamId),
          getTeamInsights(teamId),
        ]);

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

        // insightsRes shape: { teamInsights, personalInsights, members, canPost }
        const teamList = (insightsRes?.teamInsights || []) as Insight[];
        const personalList = (insightsRes?.personalInsights || []) as Insight[];

        // 🔢 keep at most 10 in state as well
        setTeamInsights(teamList.slice(0, 10));
        setPersonalInsights(personalList.slice(0, 10));

        setMembers((insightsRes?.members || []) as MemberLite[]);
        setCanPost(!!insightsRes?.canPost);

        setGoals(mappedGoals);
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
  /*const inProgressGoals = goals.filter(
    (g) => g.status === "in-progress" || !g.status
  ).length;
  const blockedGoals = goals.filter((g) => g.status === "blocked").length;*/

  const recentTeam = useMemo(
    () =>
      (teamInsights || [])
        .slice()
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        })
        .slice(0, 10),
    [teamInsights]
  );

  const recentPersonal = useMemo(
    () =>
      (personalInsights || [])
        .slice()
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        })
        .slice(0, 10),
    [personalInsights]
  );

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text || !canPost) return;

    try {
      setSaving(true);
      setInsightError(null);

      // Make sure scope is a literal type and recipientIds is string[]
      const payload =
        scope === "personal"
          ? {
              text,
              scope: "personal" as const,
              recipientIds: selectedRecipientIds,
            }
          : {
              text,
              scope: "team" as const,
              recipientIds: [] as string[],
            };

      const saved = await addTeamInsight(teamId, payload);

      const nowIso = new Date().toISOString();
      const normalized: Insight = {
        ...(saved as any),
        teamId,
        text,
        scope: payload.scope,
        recipientIds: payload.recipientIds,
        createdAt: (saved as any)?.createdAt || nowIso,
      };

      if (payload.scope === "team") {
        setTeamInsights((prev) => {
          const next = [normalized, ...(prev || [])];
          // 🔢 trim to 10 newest
          return next.slice(0, 10);
        });
      } else {
        setPersonalInsights((prev) => {
          const next = [normalized, ...(prev || [])];
          // 🔢 trim to 10 newest
          return next.slice(0, 10);
        });
      }

      // reset composer
      setNewText("");
      setSelectedRecipientIds([]);
      setScope("team");
    } catch (err: any) {
      console.error("Error adding insight:", err);
      setInsightError(err?.message || "Failed to add insight.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Team Coaching Dashboard
        </h2>
        <p className="text-sm text-gray-600">
          {isCandidateOnly
            ? "See your goals and any team or personal insights your coaches share with you."
            : "Coaches can track progress and share team-wide or personal insights with candidates."}
        </p>
      </Card>

      {/* Goal summary */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Team Goals Snapshot
        </h2>
        {loading ? (
          <p className="text-xs text-gray-500">Loading goals…</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 text-xs">
            <div className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
              <p className="text-gray-500">Total Goals</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalGoals}
              </p>
            </div>
            <div className="border border-gray-100 rounded-md px-3 py-2 bg-green-50">
              <p className="text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">
                {completedGoals}
              </p>
            </div>
            {/*
            <div className="border border-gray-100 rounded-md px-3 py-2 bg-blue-50">
              <p className="text-gray-500">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">
                {inProgressGoals}
              </p>
            </div>
            <div className="border border-gray-100 rounded-md px-3 py-2 bg-red-50">
              <p className="text-gray-500">Blocked</p>
              <p className="text-lg font-semibold text-gray-900">
                {blockedGoals}
              </p>
            </div>*/}
          </div>
        )}
      </Card>

      {/* Team Insights */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800">Team Insights</h2>
        {loading ? (
          <p className="text-xs text-gray-500 mt-2">Loading…</p>
        ) : recentTeam.length === 0 ? (
          <p className="text-xs text-gray-500 mt-2">No team insights yet.</p>
        ) : (
          <ul className="text-xs text-gray-700 space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
            {recentTeam.map((i) => (
              <li
                key={i._id || `${i.createdAt}:${i.text}`}
                className="border border-gray-100 rounded-md px-2 py-1 bg-gray-50"
              >
                <p className="text-gray-800">{i.text}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {i.authorName ? `Coach: ${i.authorName} · ` : ""}
                  {i.createdAt ? new Date(i.createdAt).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Personal Insights */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800">
          Personal Insights
        </h2>
        <p className="text-[11px] text-gray-500">
          {isCandidateOnly
            ? "These are coaching insights sent directly to you."
            : "A feed of personal insights sent to specific candidates."}
        </p>
        {loading ? (
          <p className="text-xs text-gray-500 mt-2">Loading…</p>
        ) : recentPersonal.length === 0 ? (
          <p className="text-xs text-gray-500 mt-2">
            No personal insights yet.
          </p>
        ) : (
          <ul className="text-xs text-gray-700 space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
            {recentPersonal.map((i) => {
              const recipientNames =
                (i.recipientIds || [])
                  .map(
                    (rid) =>
                      members.find((m) => m.id === rid)?.name || undefined
                  )
                  .filter(Boolean) || [];

              return (
                <li
                  key={i._id || `${i.createdAt}:${i.text}`}
                  className="border border-gray-100 rounded-md px-2 py-1 bg-gray-50"
                >
                  <p className="text-gray-800">{i.text}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {i.authorName ? `Coach: ${i.authorName} · ` : ""}
                    {i.createdAt
                      ? new Date(i.createdAt).toLocaleString()
                      : ""}
                    {isAdminOrMentor &&
                      recipientNames.length > 0 && (
                        <>
                          {" · To: "}
                          {recipientNames.join(", ")}
                        </>
                      )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Insight composer (coaches/admins only) */}
      {canPost ? (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Add Coaching Insight
          </h3>
          <form className="space-y-2" onSubmit={handleAddInsight}>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                value={scope}
                onChange={(e) =>
                  setScope(e.target.value as "team" | "personal")
                }
              >
                <option value="team">Team Insight (visible to all)</option>
                <option value="personal">
                  Personal Insight (select recipients)
                </option>
              </select>
            </div>

            {scope === "personal" && (
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Recipients
                </label>
                <div className="border border-gray-300 rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const checked = selectedRecipientIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedRecipientIds((prev) =>
                                e.target.checked
                                  ? [...prev, m.id]
                                  : prev.filter((x) => x !== m.id)
                              );
                            }}
                          />
                          {m.name}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Select one or more candidates. (Coaches are excluded from
                    this list.)
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Insight
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                rows={3}
                placeholder="e.g., Next week focus on tailoring your bullets to each job and schedule a mock technical with your mentor."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="bg-teal-600 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                disabled={
                  saving ||
                  !newText.trim() ||
                  (scope === "personal" && selectedRecipientIds.length === 0)
                }
              >
                {saving ? "Saving…" : "Add Insight"}
              </button>
              {insightError && (
                <span className="text-[11px] text-red-600">
                  {insightError}
                </span>
              )}
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="mt-2 text-[11px] text-gray-500">
            Only admins and mentors can add new insights. You&apos;ll see any
            guidance they share here.
          </p>
        </Card>
      )}
    </div>
  );
};

export default TeamDashboard;
