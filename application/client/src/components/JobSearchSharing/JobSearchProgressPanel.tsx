import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  JobSearchGoal,
  JobSearchMilestone,
} from "../../api/jobSearchSharing";
import {
  fetchGoals,
  createGoal,
  addGoalProgressApi,
  fetchMilestones,
  createMilestone,
} from "../../api/jobSearchSharing";

interface Props {
  currentUserId: string;
  onCelebrate?: (message: string) => void;
  onActivityChange?: () => void; // NEW
}

export default function JobSearchProgressPanel({
  currentUserId,
  onCelebrate,
  onActivityChange,
}: Props) {
  const [goals, setGoals] = useState<JobSearchGoal[]>([]);
  const [milestones, setMilestones] = useState<JobSearchMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState<number>(10);
  const [newGoalUnit, setNewGoalUnit] = useState("applications");
  const [newGoalDescription, setNewGoalDescription] = useState("");

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");

  const [goalProgressInputs, setGoalProgressInputs] = useState<{
    [goalId: string]: { delta: string; note: string };
  }>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [g, m] = await Promise.all([
          fetchGoals(currentUserId),
          fetchMilestones(currentUserId),
        ]);
        if (!mounted) return;
        setGoals(g);
        setMilestones(m);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Error loading progress data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  const handleCreateGoal = async () => {
    try {
      if (!newGoalTitle.trim()) return;

      const goal = await createGoal(currentUserId, {
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim(),
        targetValue: newGoalTarget,
        unit: newGoalUnit.trim(),
      });

      setGoals((prev) => [...prev, goal]);
      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalTarget(10);
      setNewGoalUnit("applications");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error creating goal");
    }
  };

  const handleGoalProgressChange = (
    goalId: string,
    field: "delta" | "note",
    value: string
  ) => {
    setGoalProgressInputs((prev) => ({
      ...prev,
      [goalId]: { ...(prev[goalId] || { delta: "", note: "" }), [field]: value },
    }));
  };

const handleAddGoalProgress = async (goal: JobSearchGoal) => {
  const input = goalProgressInputs[goal._id] || { delta: "", note: "" };
  const deltaNum = Number(input.delta);
  if (!deltaNum || isNaN(deltaNum)) return;

  const wasCompletedBefore = goal.status === "completed";

  try {
    const { goal: updatedGoal } = await addGoalProgressApi(
      currentUserId,
      goal._id,
      {
        delta: deltaNum,
        note: input.note,
      }
    );

    setGoals((prev) =>
      prev.map((g) => (g._id === updatedGoal._id ? updatedGoal : g))
    );

    setGoalProgressInputs((prev) => ({
      ...prev,
      [goal._id]: { delta: "", note: "" },
    }));
if (onActivityChange) {
  onActivityChange(); // tell parent "activity changed"
}

   // only celebrate when it *just* became completed
    if (!wasCompletedBefore && updatedGoal.status === "completed" && onCelebrate) {
      const title = updatedGoal.title || "your goal";
      onCelebrate(`Goal completed: "${title}"`);
    }
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Error updating goal progress");
  }
};

const handleCreateMilestone = async () => {
  try {
    if (!newMilestoneTitle.trim()) return;

    const title = newMilestoneTitle.trim();

    const milestone = await createMilestone(currentUserId, {
      title,
      description: newMilestoneDescription.trim(),
    });

    setMilestones((prev) => [milestone, ...prev]);
    setNewMilestoneTitle("");
    setNewMilestoneDescription("");
if (onActivityChange) {
  onActivityChange(); // milestone = activity
}
    if (onCelebrate) {
      onCelebrate(`Milestone added: "${title}"`);
    }
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Error creating milestone");
  }
};

  if (loading) {
    return (
      <Card className="p-4 mt-4">
        <p>Loading job search progress...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {error && (
        <Card className="p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Goals */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Job Search Goals</h2>

        <div className="space-y-3">
          {goals.length === 0 && (
            <p className="text-sm text-gray-600">
              No goals yet. Create your first job search goal below.
            </p>
          )}

          {goals.map((goal) => {
            const percent =
              goal.targetValue > 0
                ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
                : 0;

            const input = goalProgressInputs[goal._id] || { delta: "", note: "" };

            return (
              <div
                key={goal._id}
                className="border rounded-md p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-gray-600">{goal.description}</p>
                    )}
                    <p className="text-xs text-gray-700 mt-1">
                      {goal.currentValue} / {goal.targetValue} {goal.unit || ""} (
                      {percent}%)
                    </p>
                  </div>
                  <span
                    className={
                      "text-xs px-2 py-1 rounded-full " +
                      (goal.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : goal.status === "archived"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-blue-100 text-blue-700")
                    }
                  >
                    {goal.status}
                  </span>
                </div>

                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 bg-blue-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {goal.status !== "archived" && (
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 text-sm w-20"
                        placeholder="+2"
                        value={input.delta}
                        onChange={(e) =>
                          handleGoalProgressChange(goal._id, "delta", e.target.value)
                        }
                      />
                      <span className="text-xs text-gray-600">
                        {goal.unit || "units"}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm flex-1"
                      placeholder="Optional note"
                      value={input.note}
                      onChange={(e) =>
                        handleGoalProgressChange(goal._id, "note", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      onClick={() => handleAddGoalProgress(goal)}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New goal form */}
        <div className="border-t pt-3 mt-2">
          <h3 className="text-sm font-medium mb-2">Create a new goal</h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder="Goal title (e.g. Apply to 10 jobs per week)"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
            />
            <textarea
              className="border rounded px-2 py-1 text-sm"
              placeholder="Optional description"
              value={newGoalDescription}
              onChange={(e) => setNewGoalDescription(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                className="border rounded px-2 py-1 text-sm w-24"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(Number(e.target.value) || 0)}
              />
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm flex-1"
                value={newGoalUnit}
                onChange={(e) => setNewGoalUnit(e.target.value)}
              />
              <Button type="button" onClick={handleCreateGoal}>
                Add goal
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Milestone Achievements</h2>

        <div className="space-y-2 border-b pb-3">
          <h3 className="text-sm font-medium">Add a milestone</h3>
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm w-full"
            placeholder="Milestone title (e.g. First interview scheduled)"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
          />
          <textarea
            className="border rounded px-2 py-1 text-sm w-full"
            placeholder="Optional description"
            value={newMilestoneDescription}
            onChange={(e) => setNewMilestoneDescription(e.target.value)}
          />
          <Button type="button" onClick={handleCreateMilestone}>
            Add milestone
          </Button>
        </div>

        <div className="space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-gray-600">
              No milestones yet. Celebrate your first win by adding one above.
            </p>
          )}

          {milestones.map((m) => (
            <div key={m._id} className="flex flex-col gap-1 border rounded p-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{m.title}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(m.achievedAt).toLocaleDateString()}
                </span>
              </div>
              {m.description && (
                <p className="text-xs text-gray-700">{m.description}</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
