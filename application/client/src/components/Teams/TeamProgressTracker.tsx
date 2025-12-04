// src/components/Teams/TeamProgressTracker.tsx
import React, { useEffect, useState } from "react";
import {
  getTeamMenteeProgress,
  getTeamGoals,
  saveTeamGoal,
  updateGoalMilestone,
} from "../../api/teams";

interface TeamProgressTrackerProps {
  teamId: string;
  members: any[];
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

const TeamProgressTracker: React.FC<TeamProgressTrackerProps> = ({
  teamId,
  members,
}) => {
  const [progressByUser, setProgressByUser] = useState<Record<string, any>>({});
  const [goalsByUser, setGoalsByUser] = useState<Record<string, TeamGoal[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Add Goal modal state ---
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalMenteeId, setGoalMenteeId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetCount, setGoalTargetCount] = useState<string>("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!teamId) return;
      try {
        setLoading(true);
        setError(null);

        const progressData: Record<string, any> = {};

        // Fetch per-mentee KPIs
        for (const m of members) {
          if (!m?.userId) continue;
          try {
            const res = await getTeamMenteeProgress(teamId, m.userId);
            progressData[m.userId] = res;
          } catch (err) {
            console.error("Error loading mentee progress:", err);
          }
        }

        setProgressByUser(progressData);

        // 🔄 Fetch goals and bucket by mentee using the new getTeamGoals API
        const goalsRes = await getTeamGoals(teamId);
        const rawGoals = (goalsRes || []) as any[];
        const grouped: Record<string, TeamGoal[]> = {};

        for (const g of rawGoals) {
          const menteeId = g.userId || g.menteeId || "";
          const mappedGoal: TeamGoal = {
            _id: g._id,
            teamId: g.teamId,
            menteeId,
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
          };

          if (!grouped[menteeId]) grouped[menteeId] = [];
          grouped[menteeId].push(mappedGoal);
        }

        setGoalsByUser(grouped);
      } catch (err: any) {
        console.error("Error loading progress data:", err);
        setError(err?.message || "Failed to load progress data.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [teamId, members]);

  const openGoalModal = () => {
    setGoalError(null);
    // Default to first member if none selected yet
    if (!goalMenteeId && members.length > 0 && members[0].userId) {
      setGoalMenteeId(members[0].userId);
    }
    setShowGoalModal(true);
  };

  const closeGoalModal = () => {
    setShowGoalModal(false);
    setGoalError(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalTargetCount("");
    // keep goalMenteeId so mentors can add multiple goals for same mentee if they reopen
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;

    const title = goalTitle.trim();
    if (!title || !goalMenteeId) {
      setGoalError("Please select a mentee and enter a goal title.");
      return;
    }

    const targetCount =
      goalTargetCount.trim() === ""
        ? null
        : Number.isNaN(Number(goalTargetCount))
        ? null
        : Number(goalTargetCount);

    try {
      setSavingGoal(true);
      setGoalError(null);

      // Data that goes to the API (matches new saveTeamGoal signature)
      const apiGoalData = {
        title,
        description: goalDescription.trim() || "",
        milestones: [] as { label: string; completed?: boolean }[],
      };

      // ✅ saveTeamGoal now returns the saved goal object directly
      const saved: any = await saveTeamGoal(teamId, goalMenteeId, apiGoalData);

      const newGoal: TeamGoal = saved
        ? {
            _id: saved._id,
            teamId: saved.teamId,
            menteeId: saved.userId || goalMenteeId,
            title: saved.title,
            description: saved.description,
            // targetCount/currentCount/status are local-only for now
            targetCount,
            currentCount: 0,
            status: saved.status || "in-progress",
            milestones: saved.milestones || [],
            createdAt: saved.createdAt || new Date().toISOString(),
            updatedAt: saved.updatedAt || new Date().toISOString(),
          }
        : {
            teamId,
            menteeId: goalMenteeId,
            title: apiGoalData.title,
            description: apiGoalData.description,
            targetCount,
            currentCount: 0,
            status: "in-progress",
            milestones: apiGoalData.milestones,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      // Update local state so the new goal appears immediately
      setGoalsByUser((prev) => ({
        ...prev,
        [goalMenteeId]: [...(prev[goalMenteeId] || []), newGoal],
      }));

      closeGoalModal();
    } catch (err: any) {
      console.error("Error saving goal:", err);
      setGoalError(err?.message || "Failed to save goal.");
    } finally {
      setSavingGoal(false);
    }
  };

  // ✅ Mark milestone complete using new API: (teamId, goalId, milestoneIndex, completed)
  const handleCompleteMilestone = async (
    menteeId: string,
    goal: TeamGoal,
    milestoneIndex: number
  ) => {
    try {
      if (goal._id) {
        await updateGoalMilestone(teamId, goal._id, milestoneIndex, true);
      } else {
        console.warn(
          "Goal is missing _id; cannot sync milestone completion to server."
        );
      }

      // Update local state
      setGoalsByUser((prev) => {
        const clone: Record<string, TeamGoal[]> = { ...prev };
        const goalsForUser = (clone[menteeId] || []).map((g) => {
          if (g._id !== goal._id) return g;

          const updatedMilestones =
            g.milestones?.map((m, idx) =>
              idx === milestoneIndex
                ? {
                    ...m,
                    completed: true,
                    completedAt: new Date().toISOString(),
                  }
                : m
            ) || [];

          return { ...g, milestones: updatedMilestones };
        });

        clone[menteeId] = goalsForUser;
        return clone;
      });
    } catch (err: any) {
      console.error("Error updating milestone:", err);
      setGoalError(err?.message || "Failed to update milestone.");
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading progress data…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Mentee Progress Tracker
          </h2>
          {members.length > 0 && (
            <button
              type="button"
              className="text-xs px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700"
              onClick={openGoalModal}
            >
              Add Goal
            </button>
          )}
        </div>

        {goalError && (
          <p className="text-[11px] text-red-600">{goalError}</p>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-gray-500">No mentees found.</p>
        ) : (
          members.map((m) => {
            const userId = m.userId;
            const p = progressByUser[userId];
            const menteeGoals = goalsByUser[userId] || [];

            if (!p && menteeGoals.length === 0) {
              return null;
            }

            const jobStats = p?.jobStats || {};
            const productivity = p?.productivity || {};

            return (
              <div
                key={userId}
                className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {m.name || m.email || userId}
                </h3>

                {/* KPIs */}
                <ul className="text-xs text-gray-700 space-y-1 mb-2">
                  <li>
                    <strong>Applications:</strong>{" "}
                    {jobStats.applicationsSent ?? 0}
                  </li>
                  <li>
                    <strong>Interviews:</strong>{" "}
                    {jobStats.interviewsScheduled ?? 0}
                  </li>
                  <li>
                    <strong>Offers:</strong> {jobStats.offersReceived ?? 0}
                  </li>
                  <li>
                    <strong>Conversion Rate:</strong>{" "}
                    {jobStats.overallConversion
                      ? `${jobStats.overallConversion}%`
                      : "N/A"}
                  </li>
                  <li>
                    <strong>Productivity:</strong>{" "}
                    {productivity.averageHoursPerWeek
                      ? `${productivity.averageHoursPerWeek} hrs/week`
                      : "N/A"}
                  </li>
                </ul>

                {/* Goals & milestones for this mentee */}
                {menteeGoals.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] font-semibold text-gray-800">
                      Goals &amp; Accountability
                    </p>
                    {menteeGoals.map((g) => {
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
                          key={g._id || `${g.title}:${userId}`}
                          className="border border-gray-100 rounded-md px-2 py-2 bg-gray-50"
                        >
                          <p className="text-xs font-medium text-gray-900">
                            {g.title}
                          </p>
                          {g.description && (
                            <p className="text-[11px] text-gray-600">
                              {g.description}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-500 mt-1">
                            Status: {g.status || "in-progress"}
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

                          {g.milestones && g.milestones.length > 0 && (
                            <ul className="mt-1 text-[11px] text-gray-700 space-y-1">
                              {g.milestones.map((mstone, index) => (
                                <li
                                  key={mstone.label}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span
                                    className={
                                      mstone.completed
                                        ? "text-green-700"
                                        : "text-gray-700"
                                    }
                                  >
                                    {mstone.completed ? "✓ " : "• "}
                                    {mstone.label}
                                  </span>
                                  {!mstone.completed && (
                                    <button
                                      type="button"
                                      className="text-[10px] px-2 py-0.5 rounded border border-teal-500 text-teal-700 hover:bg-teal-50"
                                      onClick={() =>
                                        handleCompleteMilestone(
                                          userId,
                                          g,
                                          index
                                        )
                                      }
                                    >
                                      Mark done
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Simple Add Goal modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Add Goal
            </h3>
            <form className="space-y-3" onSubmit={handleSaveGoal}>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Mentee
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={goalMenteeId}
                  onChange={(e) => setGoalMenteeId(e.target.value)}
                >
                  <option value="">Select mentee…</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name || m.email || m.userId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Goal Title
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder='e.g., "Apply to 10 jobs this month"'
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  rows={2}
                  placeholder="Additional context or expectations for this goal…"
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Target Count (optional)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="e.g., 10 (applications)"
                  value={goalTargetCount}
                  onChange={(e) => setGoalTargetCount(e.target.value)}
                />
              </div>

              {goalError && (
                <p className="text-[11px] text-red-600">{goalError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={closeGoalModal}
                  disabled={savingGoal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                  disabled={savingGoal}
                >
                  {savingGoal ? "Saving…" : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamProgressTracker;
