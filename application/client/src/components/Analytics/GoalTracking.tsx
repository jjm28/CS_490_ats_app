// src/components/Analytics/GoalTracking.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchGoals,
  toggleShortTermCompletion,
  deleteGoal,
  type Goal,
  type ShortTermGoal,
} from "../../api/smartGoals";
import API_BASE from "../../utils/apiBase";
import { analyzeGoals } from "../../utils/goalInsightsEngine";

// ===== Motivational Messages =====
const MOTIVATION_MESSAGES = [
  "Small wins build big careers. Keep going.",
  "Consistency beats intensity. Show up for your next milestone.",
  "You’re closer than you think—keep pushing.",
  "Every milestone you finish is proof you can do hard things.",
  "Your future self is already proud of you.",
  "Momentum is on your side. Don’t stop now.",
  "You turned intention into action. That’s rare.",
  "Most people never follow through. You just did.",
  "Discipline today becomes freedom tomorrow.",
  "Stack enough small wins and the big goals take care of themselves.",
  "You’re building a track record you can trust.",
  "This is how confidence is built—one finished milestone at a time.",
  "You don’t need motivation, you’re building systems. Keep going.",
  "You’re turning goals into habits. That’s powerful.",
  "A year from now, this will feel like the moment everything started clicking.",
  "You’re proving to yourself that you follow through.",
  "You’re not just chasing jobs, you’re building a career story.",
  "Keep going—future offers are being earned right now.",
  "You’re training your brain to expect progress.",
  "Most people quit here. You’re not most people.",
  "This is exactly what hiring managers mean by ‘self-starter’.",
  "Your effort will outlive this milestone.",
  "You’re teaching yourself that your goals actually matter.",
  "The next milestone is where the momentum compounds.",
  "Stay locked in—this is how people quietly level up.",
  "You didn’t wait for the perfect moment. You created one.",
  "You’re building evidence that you can rely on yourself.",
  "The best version of you is cheering right now.",
  "You’ve already done something hard. The next step is easier.",
  "Your progress bar isn’t just UI—it’s your story.",
  "Great careers are built exactly like this.",
  "You’re making your future interviews way easier.",
  "Every completed milestone is a future talking point in an interview.",
  "You’re designing your own trajectory. Keep going.",
  "Another brick in the wall of your success.",
  "Lock in. You’re onto something good.",
  "This is what ‘showing up for yourself’ looks like.",
  "Your competition is scrolling. You’re progressing.",
  "You’re doing what future you wishes you’d started sooner.",
  "You are quietly becoming the person who finishes things.",
  "Most goals die between milestones. Yours won’t.",
  "This kind of consistency is what changes your ceiling.",
  "Control what you can: your next step.",
  "Today’s effort becomes tomorrow’s advantage.",
  "You’re not behind. You’re building.",
  "Keep stacking these wins. They add up.",
  "You’re the kind of person who follows through. Prove it again.",
  "Just keep moving the needle forward.",
  "You’re allowed to be proud of this.",
  "Imagine how good the finished goal will feel. Now go earn it.",
];

// ===== Celebration / Motivation Types =====
interface CelebrationState {
  goalTitle: string;
  milestoneTitle: string;
  milestoneIndex: number;
  nextMilestoneTitle: string | null;
}

interface MotivationState {
  message: string;
  nextMilestoneTitle: string | null;
}

export default function GoalTracking() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [motivation, setMotivation] = useState<MotivationState | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Load from localStorage on first render
  const [accountabilityEnabled, setAccountabilityEnabled] = useState(() => {
    const saved = localStorage.getItem("accountabilityMode");
    return saved === "true";
  });

  // Toggle + save to localStorage
  const toggleAccountability = () => {
    const next = !accountabilityEnabled;
    setAccountabilityEnabled(next);
    localStorage.setItem("accountabilityMode", String(next));
  };

  const [shareOpen, setShareOpen] = useState(false);

  const navigate = useNavigate();

  function openEditModal(goal: Goal) {
    setEditingGoal(goal);
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setEditingGoal(null);
    setIsEditOpen(false);
  }

  // ===== Load goals + jobs =====
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [goalsData, jobsRes] = await Promise.all([
          fetchGoals(),
          fetch(`${API_BASE}/api/jobs`, {
            headers: {
              "x-dev-user-id": "064cfccd-55e0-4226-be75-ba9143952fc4",
            },
          }).then((r) => r.json()),
        ]);

        setGoals(goalsData);
        setJobs(jobsRes);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load goals");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  // ===== HANDLE MILESTONE TOGGLE + CELEBRATION FLOW =====
  const handleToggleShortTerm = async (
    goalId: string,
    shortId: string,
    current: boolean
  ) => {
    const isCompleting = !current;
    let celebrationPayload: CelebrationState | null = null;

    if (isCompleting) {
      const goal = goals.find((g) => g._id === goalId);
      if (goal) {
        const sortedShorts = goal.shortTermGoals
          .slice()
          .sort(
            (a, b) =>
              new Date(a.deadline).getTime() -
              new Date(b.deadline).getTime()
          );

        const idx = sortedShorts.findIndex((st) => st._id === shortId);
        if (idx !== -1) {
          const thisMilestone = sortedShorts[idx];
          const nextMilestone = sortedShorts[idx + 1] || null;

          celebrationPayload = {
            goalTitle: goal.specific,
            milestoneTitle: thisMilestone.title || "Milestone",
            milestoneIndex: idx + 1,
            nextMilestoneTitle: nextMilestone?.title || null,
          };
        }
      }
    }

    try {
      const updated = await toggleShortTermCompletion(goalId, shortId, !current);
      setGoals((prev) =>
        prev.map((g) => (g._id === updated._id ? updated : g))
      );
      setFlash("Goal progress updated!");
      setTimeout(() => setFlash(null), 2500);

      if (isCompleting && celebrationPayload) {
        setCelebration(celebrationPayload);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update short term goal");
    }
  };

  // ===== Delete Goal =====
  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Delete this goal? This cannot be undone.")) return;
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      setFlash("Goal deleted.");
      setTimeout(() => setFlash(null), 2500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete goal");
    }
  };

  // ===== Save Edited Goal =====
  async function saveEditedGoal(updatedFields: {
    specific: string;
    measurable: string;
    achievable: boolean;
    relevant: boolean;
    deadline: string;
    shortTermGoals: ShortTermGoal[];
  }) {
    if (!editingGoal) return;

    try {
      const res = await fetch(`${API_BASE}/api/smart-goals/${editingGoal._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user-id": "064cfccd-55e0-4226-be75-ba9143952fc4",
        },
        body: JSON.stringify(updatedFields),
      });

      if (!res.ok) {
        throw new Error("Failed to update goal");
      }

      const updated = await res.json();

      setGoals((prev) =>
        prev.map((g) => (g._id === updated._id ? updated : g))
      );

      closeEditModal();
      setFlash("Goal updated!");
      setTimeout(() => setFlash(null), 2500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save goal");
    }
  }

  // ===== BASIC SNAPSHOT METRICS =====
  const {
    totalGoals,
    completedGoals,
    activeGoals,
    totalMilestones,
    completedMilestones,
  } = useMemo(() => {
    if (goals.length === 0) {
      return {
        totalGoals: 0,
        completedGoals: 0,
        activeGoals: 0,
        totalMilestones: 0,
        completedMilestones: 0,
      };
    }

    let completed = 0;
    let active = 0;
    let totalMs = 0;
    let doneMs = 0;

    goals.forEach((g) => {
      const ms = g.shortTermGoals || [];
      const allCompleted = ms.length > 0 && ms.every((m) => m.completed);
      const anyCompleted = ms.some((m) => m.completed);

      if (allCompleted) completed++;
      if (!allCompleted && (ms.length > 0 || anyCompleted)) active++;

      totalMs += ms.length;
      doneMs += ms.filter((m) => m.completed).length;
    });

    return {
      totalGoals: goals.length,
      completedGoals: completed,
      activeGoals: active,
      totalMilestones: totalMs,
      completedMilestones: doneMs,
    };
  }, [goals]);

  // ===== ADVANCED INSIGHTS (ENGINE) =====
  const insights = useMemo(() => analyzeGoals(goals, jobs), [goals, jobs]);

  // ===== Celebration → Motivation Flow =====
  const handleCloseCelebration = () => {
    if (celebration) {
      const randomIndex = Math.floor(
        Math.random() * MOTIVATION_MESSAGES.length
      );
      const randomMessage = MOTIVATION_MESSAGES[randomIndex];

      if (celebration.nextMilestoneTitle) {
        setMotivation({
          message: randomMessage,
          nextMilestoneTitle: celebration.nextMilestoneTitle,
        });
      }
    }
    setCelebration(null);
  };

  const handleCloseMotivation = () => {
    setMotivation(null);
  };

  if (loading) {
    return <div className="p-6">Loading goals…</div>;
  }

  return (
    <div className="p-10 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-center my-6">
        <div className="flex-1 border-t border-gray-300"></div>
        <h1 className="mx-4 text-3xl font-bold text-(--brand-navy)">
          Goal Tracking & Insights
        </h1>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => navigate("/analytics/goals/new")}
          className="px-4 py-2 rounded-lg bg-(--brand-navy) text-white font-medium hover:bg-(--brand-navy-dark)"
        >
          + Add SMART Goal
        </button>
      </div>

      <div className="flex justify-start mt-2">
        <button onClick={toggleAccountability}>
          {accountabilityEnabled ? "Disable Accountability" : "Enable Accountability"}
        </button>
      </div>

      {flash && <p className="text-green-700 text-sm">{flash}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* ===== COLLAPSIBLE ANALYTICS ===== */}
      <div className="mt-8">
        <button
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          className="w-full flex items-center justify-between bg-white border rounded-xl shadow-sm px-5 py-4 hover:bg-gray-50 transition"
        >
          <h2 className="text-xl font-semibold text-(--brand-navy)">
            Analytics Dashboard
          </h2>

          <span className="text-(--brand-navy) text-lg">
            {analyticsOpen ? "▲" : "▼"}
          </span>
        </button>

        <button
          onClick={() => setShareOpen(true)}
          className="px-4 py-2 bg-(--brand-navy) text-white rounded-lg shadow hover:bg-(--brand-navy-dark)"
        >
          Share Weekly Progress
        </button>

        {analyticsOpen && (
          <section className="bg-white border border-t-0 rounded-b-xl shadow-sm p-6 space-y-4 animate-fadeIn">
            {/* High-level stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gray-50 space-y-1">
                <h3 className="text-sm font-semibold text-(--brand-navy)">Goal Snapshot</h3>
                <p className="text-sm">Total Goals: <strong>{totalGoals}</strong></p>
                <p className="text-sm">Active Goals: <strong>{activeGoals}</strong></p>
                <p className="text-sm">Completed Goals: <strong>{completedGoals}</strong></p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-1">
                <h3 className="text-sm font-semibold text-(--brand-navy)">Goal Achievement</h3>
                <p className="text-sm">Goal Completion Rate: <strong>{insights.completionRate}%</strong></p>
                <p className="text-sm">On-Time Milestones: <strong>{insights.avgOnTimeRate}%</strong></p>
                <p className="text-sm">Late Milestones: <strong>{insights.avgLateRate}%</strong></p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-1">
                <h3 className="text-sm font-semibold text-(--brand-navy)">Milestone Design</h3>
                <p className="text-sm">Avg Milestones / Goal: <strong>{insights.avgMilestones.toFixed(1)}</strong></p>
                <p className="text-sm">Total Milestones: <strong>{totalMilestones}</strong></p>
                <p className="text-sm">Completed Milestones: <strong>{completedMilestones}</strong></p>
                {insights.avgSpacingDays !== null && (
                  <p className="text-xs text-gray-600">
                    Typical spacing: <strong>{insights.avgSpacingDays} days</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Job Success Impact */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <h3 className="text-sm font-semibold text-(--brand-navy)">Job Success Impact</h3>

              <p className="text-sm">
                Goals Leading to Interviews:{" "}
                <strong>{insights.careerSuccess.goalsLeadingToInterviews}</strong>
              </p>

              <p className="text-sm">
                Goals Leading to Offers (count):{" "}
                <strong>{insights.careerSuccess.goalsLeadingToOffers}</strong>
              </p>

              <p className="text-sm">
                Goals Leading to Offers (% of linked goals):{" "}
                <strong>{insights.careerSuccess.offerConversionRate}%</strong>
              </p>

              {insights.careerSuccess.goalsLeadingToOffers === 0 && (
                <p className="text-xs text-gray-500">
                  Link goals to applications and track them through the pipeline to see offer
                  conversion here.
                </p>
              )}
            </div>

            {/* Engine Recommendations */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <h3 className="text-sm font-semibold text-(--brand-navy)">Smart Goal Recommendations</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* ===== GOAL LIST & MILESTONES ===== */}
      {goals.length === 0 ? (
        <p className="text-gray-600">
          No goals yet. Click &ldquo;Add SMART Goal&rdquo; to create your first
          one.
        </p>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const totalShort = goal.shortTermGoals.length;
            const completedShort = goal.shortTermGoals.filter(
              (st) => st.completed
            ).length;
            const progress =
              totalShort > 0
                ? Math.round((completedShort / totalShort) * 100)
                : 0;
            const allDone = totalShort > 0 && completedShort === totalShort;

            return (
              <section
                key={goal._id}
                className="bg-white border rounded-xl shadow-sm p-6 space-y-4"
              >
                <div className="flex flex-col items-center text-center space-y-1 w-full">
                  <h2 className="text-2xl font-semibold text-(--brand-navy)">
                    {goal.specific}
                  </h2>

                  <p className="text-sm text-gray-600">
                    Deadline: <strong>{new Date(goal.deadline).toLocaleDateString()}</strong>
                  </p>

                  <p className="text-sm text-gray-600">
                    Achievable: <strong>{goal.achievable ? "Yes" : "No"}</strong> ·
                    Relevant: <strong>{goal.relevant ? "Yes" : "No"}</strong>
                  </p>

                  <div className="flex gap-4 mt-2">
                    <button onClick={() => openEditModal(goal)}
                      className="text-sm text-blue-600 hover:underline">Edit</button>

                    <button onClick={() => handleDeleteGoal(goal._id)}
                      className="text-sm text-red-600 hover:underline">Delete</button>
                  </div>

                  {allDone && (
                    <span className="text-green-700 text-sm mt-1">🎉 Completed!</span>
                  )}
                </div>
                {/* Overall goal progress bar */}
                {totalShort > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>
                        Progress: {completedShort}/{totalShort} milestones
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-(--brand-navy) transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Short-term goals as milestone cards */}
                {totalShort > 0 && (
                  <div className="space-y-3 mt-4">
                    <h3 className="font-semibold text-sm text-(--brand-navy)">
                      Short-Term Milestones
                    </h3>

                    {(() => {
                      const sortedShorts = goal.shortTermGoals
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.deadline).getTime() -
                            new Date(b.deadline).getTime()
                        );

                      const now = new Date();
                      let previousDeadline: Date | null = null;

                      return sortedShorts.map((st, idx) => {
                        const dueDate = new Date(st.deadline);
                        const startDate =
                          idx === 0 ? now : previousDeadline || now;
                        previousDeadline = dueDate;

                        let pct = 0;
                        if (st.completed) {
                          pct = 100;
                        } else {
                          const totalMs =
                            dueDate.getTime() - startDate.getTime();
                          const elapsedMs =
                            now.getTime() - startDate.getTime();

                          if (totalMs <= 0) {
                            pct = 100;
                          } else {
                            const ratio = Math.min(
                              1,
                              Math.max(0, elapsedMs / totalMs)
                            );
                            pct = Math.round(ratio * 100);
                          }
                        }

                        const canToggle =
                          idx === 0 ||
                          sortedShorts
                            .slice(0, idx)
                            .every((prev) => prev.completed);

                        return (
                          <div
                            key={st._id || idx}
                            className="border rounded-lg p-3 bg-gray-50 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-(--brand-navy)">
                                Milestone {idx + 1}:{" "}
                                {st.title || "Untitled milestone"}
                              </span>
                              <label className="flex items-center gap-2 text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  disabled={!canToggle}
                                  onChange={() =>
                                    st._id &&
                                    handleToggleShortTerm(
                                      goal._id,
                                      st._id,
                                      st.completed
                                    )
                                  }
                                />
                                <span>
                                  {st.completed ? "Completed" : "Mark complete"}
                                </span>
                              </label>
                            </div>

                            <div className="flex justify-between text-xs text-gray-600">
                              <span>
                                Start:{" "}
                                {startDate.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span>
                                Due:{" "}
                                {dueDate.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`h-full transition-all ${st.completed
                                  ? "bg-green-600"
                                  : "bg-(--brand-navy)"
                                  }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            {!canToggle && !st.completed && (
                              <p className="text-xs text-gray-500 italic">
                                Complete earlier milestones to unlock this one.
                              </p>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <EditGoalModal
        isOpen={isEditOpen}
        goal={editingGoal}
        onClose={closeEditModal}
        onSave={saveEditedGoal}
      />

      {/* Celebration & Motivation Modals */}
      <CelebrationModal
        celebration={celebration}
        onClose={handleCloseCelebration}
      />
      <MotivationModal
        motivation={motivation}
        onClose={handleCloseMotivation}
      />
    </div>
  );
}

// ===================== EDIT MODAL =====================

function EditGoalModal({
  isOpen,
  goal,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (updatedGoal: {
    specific: string;
    measurable: string;
    achievable: boolean;
    relevant: boolean;
    deadline: string;
    linkedJobId: string | null;
    shortTermGoals: ShortTermGoal[];
  }) => void;
}) {
  const [specific, setSpecific] = useState(goal?.specific ?? "");
  const [linkedJobId, setLinkedJobId] = useState(goal?.linkedJobId ?? "");
  const [jobs, setJobs] = useState<any[]>([]);
  const [measurable, setMeasurable] = useState(goal?.measurable ?? "");
  const [achievable, setAchievable] = useState(goal?.achievable ?? true);
  const [relevant, setRelevant] = useState(goal?.relevant ?? true);
  const [deadline, setDeadline] = useState(
    goal ? goal.deadline.substring(0, 10) : ""
  );

  const [milestones, setMilestones] = useState<
    (ShortTermGoal & { deadline: string })[]
  >(
    goal
      ? goal.shortTermGoals.map((m) => ({
        ...m,
        deadline: m.deadline.substring(0, 10),
      }))
      : []
  );

  // Sync when goal changes
  useEffect(() => {
    if (!goal) return;
    setSpecific(goal.specific);
    setMeasurable(goal.measurable);
    setAchievable(goal.achievable);
    setRelevant(goal.relevant);
    setDeadline(goal.deadline.substring(0, 10));
    setMilestones(
      goal.shortTermGoals.map((m) => ({
        ...m,
        deadline: m.deadline.substring(0, 10),
      }))
    );
  }, [goal]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
          headers: { "x-dev-user-id": "064cfccd-55e0-4226-be75-ba9143952fc4" }
        });
        const data = await res.json();
        setJobs(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
      }
    }
    loadJobs();
  }, []);

  if (!isOpen || !goal) return null;

  function updateMilestone<
    K extends keyof (typeof milestones)[number]
  >(idx: number, key: K, value: (typeof milestones)[number][K]) {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], [key]: value };
    setMilestones(updated);
  }

  function removeMilestone(idx: number) {
    const updated = [...milestones];
    updated.splice(idx, 1);
    setMilestones(updated);
  }

  function addMilestone() {
    setMilestones([
      ...milestones,
      { title: "", deadline: "", completed: false, _id: undefined },
    ]);
  }

  function handleSave() {
    onSave({
      specific,
      measurable,
      achievable,
      relevant,
      deadline,
      linkedJobId,
      shortTermGoals: milestones.map((m) => ({
        _id: m._id,
        title: m.title,
        deadline: m.deadline,
        completed: m.completed,
        completedAt: m.completedAt ?? null,
      }))
    });
  }
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl space-y-4 animate-fadeIn">
        <h2 className="text-xl font-bold text-center">Edit Goal</h2>
        <div className="space-y-1">
          <label className="font-semibold text-sm">Specific</label>
          <input
            className="w-full border p-2 rounded"
            value={specific}
            onChange={(e) => setSpecific(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-sm">Measurable</label>
          <input
            className="w-full border p-2 rounded"
            value={measurable}
            onChange={(e) => setMeasurable(e.target.value)}
          />
        </div>

        <div className="flex justify-between gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={achievable}
              onChange={() => setAchievable(!achievable)}
            />
            Achievable
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={relevant}
              onChange={() => setRelevant(!relevant)}
            />
            Relevant
          </label>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-sm">Deadline</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-sm">Linked Job Application (optional)</label>
          <select
            className="w-full border p-2 rounded"
            value={linkedJobId}
            onChange={(e) => setLinkedJobId(e.target.value)}
          >
            <option value="">Not Linked</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.company} — {job.position}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-sm">Milestones</h3>

          {milestones.map((m, idx) => (
            <div
              key={m._id || idx}
              className="border rounded p-3 space-y-2 bg-gray-50"
            >
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Milestone title"
                value={m.title}
                onChange={(e) =>
                  updateMilestone(idx, "title", e.target.value)
                }
              />

              <input
                type="date"
                className="w-full border p-2 rounded text-sm"
                value={m.deadline}
                onChange={(e) =>
                  updateMilestone(idx, "deadline", e.target.value)
                }
              />

              <button
                type="button"
                className="text-red-600 text-xs"
                onClick={() => removeMilestone(idx)}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            className="w-full bg-gray-200 py-2 rounded text-sm"
            onClick={addMilestone}
          >
            + Add Milestone
          </button>
        </div>

        <div className="flex justify-end gap-4 pt-2">
          <button
            type="button"
            className="text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== CELEBRATION MODAL =====================

function CelebrationModal({
  celebration,
  onClose,
}: {
  celebration: CelebrationState | null;
  onClose: () => void;
}) {
  if (!celebration) return null;

  const { goalTitle, milestoneTitle, milestoneIndex } = celebration;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-center space-y-4 animate-fadeIn">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-(--brand-navy)">
          Milestone {milestoneIndex} Complete!
        </h2>
        <p className="text-sm text-gray-700">
          <strong>{milestoneTitle}</strong> from{" "}
          <span className="italic">{goalTitle}</span> is now done.
        </p>
        <p className="text-xs text-gray-500">
          Take a second to appreciate that—you just moved your career forward.
        </p>
        <button
          className="mt-2 px-4 py-2 rounded-lg bg-(--brand-navy) text-white text-sm font-medium hover:bg-(--brand-navy-dark)"
          onClick={onClose}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ===================== MOTIVATION MODAL =====================

function MotivationModal({
  motivation,
  onClose,
}: {
  motivation: MotivationState | null;
  onClose: () => void;
}) {
  if (!motivation) return null;

  const { message, nextMilestoneTitle } = motivation;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-[90]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 text-center animate-fadeIn">
        <h2 className="text-lg font-bold text-(--brand-navy)">
          Keep the Momentum Going 💪
        </h2>
        {nextMilestoneTitle && (
          <p className="text-sm text-gray-700">
            Next up: <strong>{nextMilestoneTitle}</strong>
          </p>
        )}
        <p className="text-sm text-gray-600 italic">“{message}”</p>
        <button
          className="mt-2 px-4 py-2 rounded-lg bg-(--brand-navy) text-white text-sm font-medium hover:bg-(--brand-navy-dark)"
          onClick={onClose}
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}