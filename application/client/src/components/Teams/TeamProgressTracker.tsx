// src/components/Teams/TeamProgressTracker.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  getTeamMenteeProgress,
  getTeamGoals,
  saveTeamGoal,
  updateGoalMilestone,
  markTeamGoalComplete,
} from "../../api/teams";

interface TeamProgressTrackerProps {
  teamId: string;
  members: any[];
  // roles of the viewer (current user)
  viewerRoles: string[];
}

interface TeamGoal {
  _id?: string;
  teamId: string;
  menteeId: string;
  title: string;
  description?: string;
  targetCount?: number | null;
  currentCount?: number;
  status?:
    | "not-started"
    | "in-progress"
    | "completed"
    | "blocked"
    | "active"
    | string;
  milestones?: {
    label?: string;
    title?: string;
    completed?: boolean;
    completedAt?: string;
  }[];
  completionComment?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TeamProgressTracker: React.FC<TeamProgressTrackerProps> = ({
  teamId,
  members,
  viewerRoles,
}) => {
  const [progressByUser, setProgressByUser] = useState<Record<string, any>>({});
  const [goalsByUser, setGoalsByUser] = useState<Record<string, TeamGoal[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Add Goal modal state (coach only) ---
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalMenteeId, setGoalMenteeId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetCount, setGoalTargetCount] = useState<string>("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // --- Goal details / completion modal (used by both) ---
  const [selectedGoal, setSelectedGoal] = useState<TeamGoal | null>(null);
  const [selectedGoalMenteeLabel, setSelectedGoalMenteeLabel] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // ✅ Treat as admin/mentor ONLY if they are not a candidate
  const isAdminOrMentor =
    !viewerRoles.includes("candidate") &&
    (viewerRoles.includes("admin") || viewerRoles.includes("mentor"));

  // Only candidate members appear in this tracker
  const candidateMembers = useMemo(
    () =>
      Array.isArray(members)
        ? members.filter(
            (m) =>
              Array.isArray(m.roles) &&
              (m.roles as string[]).includes("candidate")
          )
        : [],
    [members]
  );

  // Safely infer the viewer's userId so a candidate only sees THEMSELVES
  const viewerUserId: string | undefined = useMemo(() => {
    if (!Array.isArray(members)) return undefined;

    // 0) If viewer is a candidate, prefer the auth userId from localStorage if present
    if (viewerRoles.includes("candidate")) {
      try {
        if (typeof window !== "undefined") {
          const storedId = window.localStorage.getItem("userId");
          if (storedId) {
            return storedId;
          }
        }
      } catch {
        // ignore localStorage issues
      }
    }

    // 1) Prefer explicit flags if the membership objects carry them
    const self =
      members.find(
        (m: any) => m.isCurrentUser || m.isSelf || m.currentUser
      ) || null;
    if (self?.userId) return self.userId as string;

    // 2) If the viewer is a candidate and there is EXACTLY ONE candidate member,
    //    assume that candidate is the viewer (common case for candidate view).
    if (
      viewerRoles.includes("candidate") &&
      candidateMembers.length === 1 &&
      candidateMembers[0].userId
    ) {
      return candidateMembers[0].userId as string;
    }

    // 3) Otherwise don't guess – better to show nothing than leak others' data
    return undefined;
  }, [members, viewerRoles, candidateMembers]);

  // Who to show:
  // - Coach/admin: all candidate members
  // - Candidate: ONLY themselves (if we can identify), otherwise no one (fail-safe)
  const menteesToShow = isAdminOrMentor
    ? candidateMembers
    : viewerUserId
    ? candidateMembers.filter((m) => m.userId === viewerUserId)
    : [];

  useEffect(() => {
    const load = async () => {
      if (!teamId) return;
      try {
        setLoading(true);
        setError(null);

        const progressData: Record<string, any> = {};

        // Decide whose KPIs to fetch: exactly the mentees we're going to show
        const targets = menteesToShow;

        // Fetch KPIs per candidate (only themselves if candidate viewer)
        for (const m of targets) {
          if (!m?.userId) continue;
          try {
            const res = await getTeamMenteeProgress(teamId, m.userId);
            // Store whatever the API gives us (we'll normalize when reading)
            progressData[m.userId] = res || {};
          } catch (err) {
            console.error("Error loading mentee progress:", err);
          }
        }

        setProgressByUser(progressData);

        // Fetch all goals and bucket by mentee using getTeamGoals
        const goalsRes = await getTeamGoals(teamId);
        const rawGoals = (goalsRes || []) as any[];
        const grouped: Record<string, TeamGoal[]> = {};

        for (const g of rawGoals) {
          const menteeId = g.userId || g.menteeId || "";

          // ✅ If viewer is a candidate, only keep their own goals
          if (!isAdminOrMentor && viewerUserId && menteeId !== viewerUserId) {
            continue;
          }

          const mappedGoal: TeamGoal = {
            _id: g._id?.toString?.() || g._id,
            teamId: g.teamId?.toString?.() || g.teamId,
            menteeId,
            title: g.title,
            description: g.description,
            targetCount:
              typeof g.targetCount === "number" ? g.targetCount : null,
            currentCount:
              typeof g.currentCount === "number" ? g.currentCount : 0,
            status: g.status,
            milestones: g.milestones,
            completionComment: g.completionComment,
            completedAt: g.completedAt,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          };
          if (!grouped[menteeId]) grouped[menteeId] = [];
          grouped[menteeId].push(mappedGoal);
        }

        setGoalsByUser(grouped);
      } catch (err: any) {
        console.error("Error loading team progress:", err);
        setError(err?.message || "Failed to load mentee progress.");
      } finally {
        setLoading(false);
      }
    };

    void load();
    // We intentionally depend on properties that determine menteesToShow,
    // not menteesToShow itself, to avoid infinite loops.
  }, [teamId, menteesToShow.length]);

  const openGoalModal = () => {
    setGoalError(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalTargetCount("");
    setShowGoalModal(true);

    if (
      !goalMenteeId &&
      candidateMembers.length > 0 &&
      candidateMembers[0].userId
    ) {
      setGoalMenteeId(candidateMembers[0].userId);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !goalTitle.trim() || !goalMenteeId || !isAdminOrMentor) {
      return;
    }

    try {
      setSavingGoal(true);
      setGoalError(null);

      // Call the API with the correct 3-arg signature
      const saved = await saveTeamGoal(teamId, goalMenteeId, {
        title: goalTitle.trim(),
        description: goalDescription.trim() || undefined,
        milestones: [],
      });

      const mapped: TeamGoal = {
        ...(saved as any),
        _id: (saved as any)._id?.toString?.() || (saved as any)._id,
        menteeId: (saved as any).userId || goalMenteeId,
      };

      setGoalsByUser((prev) => {
        const existing = prev[goalMenteeId] || [];
        return {
          ...prev,
          [goalMenteeId]: [mapped, ...existing],
        };
      });

      setShowGoalModal(false);
    } catch (err: any) {
      console.error("Error saving goal:", err);
      setGoalError(err?.message || "Failed to save goal.");
    } finally {
      setSavingGoal(false);
    }
  };

  const handleToggleMilestone = async (
    menteeId: string,
    goal: TeamGoal,
    milestoneIndex: number
  ) => {
    if (!goal._id) return;

    try {
      const existing = goalsByUser[menteeId] || [];
      const target = existing.find((g) => g._id === goal._id);
      if (!target || !target.milestones) return;

      const m = target.milestones[milestoneIndex];
      const newCompleted = !m.completed;

      // Only coaches should be able to toggle milestones
      if (!isAdminOrMentor) return;

      await updateGoalMilestone(teamId, goal._id!, milestoneIndex, newCompleted);

      setGoalsByUser((prev) => {
        const copy = { ...prev };
        const goalsForUser = [...(copy[menteeId] || [])];
        const idx = goalsForUser.findIndex((g) => g._id === goal._id);
        if (idx >= 0) {
          const clonedGoal = { ...goalsForUser[idx] };
          if (clonedGoal.milestones) {
            const ms = [...clonedGoal.milestones];
            const old = ms[milestoneIndex] || {};
            ms[milestoneIndex] = {
              ...old,
              completed: newCompleted,
              completedAt: newCompleted
                ? new Date().toISOString()
                : undefined,
            };
            clonedGoal.milestones = ms;
          }
          goalsForUser[idx] = clonedGoal;
        }
        copy[menteeId] = goalsForUser;
        return copy;
      });
    } catch (err) {
      console.error("Error toggling milestone:", err);
    }
  };

  const openGoalDetails = (menteeLabel: string, goal: TeamGoal) => {
    setSelectedGoal(goal);
    setSelectedGoalMenteeLabel(menteeLabel);
    setCompletionNote(goal.completionComment || "");
    setCompletionError(null);
  };

  const closeGoalDetails = () => {
    setSelectedGoal(null);
    setCompletionNote("");
    setCompletionError(null);
  };

  const handleCompleteGoal = async () => {
    if (!teamId || !selectedGoal?._id) return;

    try {
      setCompletionSaving(true);
      setCompletionError(null);

      const updated = await markTeamGoalComplete(
        teamId,
        selectedGoal._id,
        true,
        completionNote.trim()
      );

      const menteeId =
        updated.userId || updated.menteeId || selectedGoal.menteeId;

      const newGoal: TeamGoal = {
        ...selectedGoal,
        status: updated.status || "completed",
        completionComment:
          updated.completionComment || completionNote.trim() || "",
        completedAt:
          updated.completedAt ||
          selectedGoal.completedAt ||
          new Date().toISOString(),
      };

      setGoalsByUser((prev) => {
        const copy = { ...prev };
        const list = [...(copy[menteeId] || [])];
        const idx = list.findIndex((g) => g._id === selectedGoal._id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...newGoal };
        } else {
          list.push(newGoal);
        }
        copy[menteeId] = list;
        return copy;
      });

      setSelectedGoal((prev) => (prev ? { ...prev, ...newGoal } : prev));
    } catch (err: any) {
      console.error("Error marking goal complete:", err);
      setCompletionError(err?.message || "Failed to update goal.");
    } finally {
      setCompletionSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 text-sm text-gray-500">
        Loading mentee progress…
      </div>
    );
  }

  if (error) {
    return <div className="mt-4 text-sm text-red-600">{error}</div>;
  }

  if (menteesToShow.length === 0) {
    return (
      <div className="mt-4 text-sm text-gray-500">
        {isAdminOrMentor
          ? "No candidates found on this team yet. Add candidates to see them in the mentee progress tracker."
          : "We couldn’t find your candidate profile on this team yet, so there’s no progress to display."}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">
          {isAdminOrMentor ? "Mentee Progress Tracker" : "My Goals & Progress"}
        </h2>
        {isAdminOrMentor && (
          <button
            type="button"
            onClick={openGoalModal}
            className="bg-teal-600 text-white text-xs px-3 py-1 rounded-md"
          >
            Add Goal for Candidate
          </button>
        )}
      </div>

      {/* Per-candidate sections */}
      {menteesToShow.map((m) => {
        const uid = m.userId;
        const name = m.name || "Candidate";
        const email = m.email || m.invitedEmail || "";

        // Always normalize progress to an object so stats render
        const progress: any = (uid && progressByUser[uid]) || {};

        // Support both shapes:
        // - { jobStats: {...} }
        // - { applicationsSent, interviewsScheduled, offersReceived, ... }
        const jobStats = progress.jobStats || progress || {};

        const apps = jobStats.applicationsSent ?? 0;
        const interviews = jobStats.interviewsScheduled ?? 0;
        const offers = jobStats.offersReceived ?? 0;
        const overallConversion =
          jobStats.overallConversion ??
          jobStats.conversion?.applyToOffer ??
          0;
        const responseRate = jobStats.responseRate ?? 0;
        const avgResponseTime =
          jobStats.averageResponseTimeDisplay || "—";

        const goals = uid ? goalsByUser[uid] || [] : [];

        return (
          <div
            key={uid || email}
            className="border border-gray-100 rounded-lg p-4 bg-white"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {name}
                </p>
                <p className="text-xs text-gray-500">{email}</p>
              </div>

              {/* Header KPI strip */}
              <div className="flex gap-3 text-xs text-gray-700">
                <div>
                  <span className="font-semibold">{apps}</span> apps
                </div>
                <div>
                  <span className="font-semibold">{interviews}</span>{" "}
                  interviews
                </div>
                <div>
                  <span className="font-semibold">{offers}</span> offers
                </div>
              </div>
            </div>

            {/* Detailed Job Stats per candidate */}
            <div className="mt-2 mb-3 rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-800 mb-1">
                Job Search Stats
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-[11px] text-gray-700">
                <div>
                  <span className="font-medium">Conversion to offer: </span>
                  {overallConversion}%
                </div>
                <div>
                  <span className="font-medium">Response rate: </span>
                  {responseRate}%
                </div>
                <div>
                  <span className="font-medium">Avg response time: </span>
                  {avgResponseTime}
                </div>
              </div>
            </div>

            {/* Goals for this mentee */}
            <div className="mt-2 space-y-2">
              {goals.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No goals created yet for this candidate.
                </p>
              ) : (
                goals.map((g) => (
                  <div
                    key={g._id || g.title}
                    className="border border-gray-100 rounded-md p-2 bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {g.title}
                        </p>
                        {g.description && (
                          <p className="text-[11px] text-gray-600">
                            {g.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {g.status && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 capitalize">
                            {g.status}
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-[11px] text-teal-600 hover:underline"
                          onClick={() => openGoalDetails(name, g)}
                        >
                          View details
                        </button>
                      </div>
                    </div>

                    {g.milestones && g.milestones.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-500 mb-1">
                          Milestones
                        </p>
                        <ul className="space-y-1">
                          {g.milestones.map((ms, idx) => {
                            const completed = !!ms.completed;
                            const label = ms.label || ms.title || "";

                            return (
                              <li
                                key={`${g._id || g.title}-ms-${idx}`}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                <button
                                  type="button"
                                  onClick={
                                    isAdminOrMentor
                                      ? () =>
                                          handleToggleMilestone(uid, g, idx)
                                      : undefined
                                  }
                                  disabled={!isAdminOrMentor}
                                  className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[10px] ${
                                    completed
                                      ? "bg-teal-600 border-teal-600 text-white"
                                      : "border-gray-300 text-gray-400"
                                  } ${
                                    !isAdminOrMentor
                                      ? "opacity-60 cursor-default"
                                      : ""
                                  }`}
                                >
                                  {completed ? "✓" : ""}
                                </button>
                                <span
                                  className={
                                    completed
                                      ? "line-through text-gray-500"
                                      : "text-gray-800"
                                  }
                                >
                                  {label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Add Goal Modal (coach only) */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Create Goal for Candidate
            </h3>
            <form className="space-y-3" onSubmit={handleSaveGoal}>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Candidate
                </label>
                <select
                  value={goalMenteeId}
                  onChange={(e) => setGoalMenteeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                >
                  <option value="">Select candidate</option>
                  {candidateMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name || m.email || m.invitedEmail || "Candidate"}
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
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  rows={2}
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Target count (optional)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="e.g. 10 applications"
                  value={goalTargetCount}
                  onChange={(e) => setGoalTargetCount(e.target.value)}
                />
              </div>

              {goalError && (
                <p className="text-[11px] text-red-600">{goalError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-600"
                  onClick={() => setShowGoalModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-60"
                  disabled={savingGoal}
                >
                  {savingGoal ? "Saving…" : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Details / Completion Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {selectedGoal.title}
            </h3>
            <p className="text-[11px] text-gray-500 mb-1">
              For: {selectedGoalMenteeLabel}
            </p>
            <p className="text-[11px] text-gray-600 mb-2">
              {selectedGoal.description || "No description provided."}
            </p>
            <p className="text-[11px] mb-2">
              <span className="font-medium">Status:</span>{" "}
              <span className="capitalize">
                {selectedGoal.status || "active"}
              </span>
            </p>

            {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-gray-500 mb-1">Milestones</p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedGoal.milestones.map((ms, idx) => (
                    <li
                      key={idx}
                      className={`text-[11px] ${
                        ms.completed
                          ? "line-through text-gray-500"
                          : "text-gray-800"
                      }`}
                    >
                      {ms.label || ms.title || ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedGoal.completionComment && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-gray-700">
                  Completion note:
                </p>
                <p className="text-[11px] text-gray-600">
                  {selectedGoal.completionComment}
                </p>
              </div>
            )}

            {/* Candidate-only: mark complete + add comment */}
            {!isAdminOrMentor && selectedGoal.status !== "completed" && (
              <div className="mb-3">
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  What did you do to complete this goal?
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  rows={3}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Describe what you did…"
                />
                {completionError && (
                  <p className="text-[11px] text-red-600 mt-1">
                    {completionError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCompleteGoal}
                  className="mt-2 text-xs px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-60"
                  disabled={completionSaving || !completionNote.trim()}
                >
                  {completionSaving ? "Saving…" : "Mark Complete"}
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-600"
                onClick={closeGoalDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamProgressTracker;
