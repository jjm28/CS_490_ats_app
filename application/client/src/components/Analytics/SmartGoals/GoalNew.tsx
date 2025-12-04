import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createGoal } from "../../../api/smartGoals";
import API_BASE from "../../../utils/apiBase";

interface ShortDraft {
    id: string;
    title: string;
    deadline: string; // YYYY-MM-DD
}

export default function GoalNew() {
    const [specific, setSpecific] = useState("");
    const [achievable, setAchievable] = useState(false);
    const [relevant, setRelevant] = useState(false);
    const [deadline, setDeadline] = useState("");
    const [shortTerms, setShortTerms] = useState<ShortDraft[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkedJobId, setLinkedJobId] = useState("");
    const [jobs, setJobs] = useState<any[]>([]);

    const navigate = useNavigate();

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

    const measurableText = "Progress tracked automatically by OnTrack.";

    const addShortTerm = () => {
        if (!deadline) {
            setError("Set a deadline for the main goal before adding milestones.");
            return;
        }
        setShortTerms((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                title: "",
                deadline: deadline, // default to final deadline; user can tweak
            },
        ]);
    };

    const updateShortTerm = (id: string, field: keyof ShortDraft, value: string) => {
        setShortTerms((prev) =>
            prev.map((st) => (st.id === id ? { ...st, [field]: value } : st))
        );
    };

    const removeShortTerm = (id: string) => {
        setShortTerms((prev) => prev.filter((st) => st.id !== id));
    };

    const validate = (): boolean => {
        setError(null);

        if (!specific.trim()) {
            setError("Please enter a specific goal.");
            return false;
        }
        if (!achievable) {
            setError("Please confirm that your goal is achievable.");
            return false;
        }
        if (!relevant) {
            setError("Please confirm that your goal is relevant.");
            return false;
        }
        if (!deadline) {
            setError("Please select a deadline for your goal.");
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);

        if (deadlineDate < today) {
            setError("Deadline must be today or in the future.");
            return false;
        }

        // Short-term validation
        if (shortTerms.length > 0) {
            // 1) all have titles & deadlines
            for (const st of shortTerms) {
                if (!st.title.trim()) {
                    setError("All short-term goals must have a title.");
                    return false;
                }
                if (!st.deadline) {
                    setError("All short-term goals must have a deadline.");
                    return false;
                }
            }

            // 2) chronological + within range
            const sorted = [...shortTerms].sort(
                (a, b) =>
                    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
            );

            const originalOrderIds = shortTerms.map((s) => s.id);
            const sortedIds = sorted.map((s) => s.id);
            if (JSON.stringify(originalOrderIds) !== JSON.stringify(sortedIds)) {
                setError(
                    "Short-term goals must be in chronological order from top to bottom."
                );
                return false;
            }

            for (const st of sorted) {
                const d = new Date(st.deadline);
                if (d < today) {
                    setError(
                        "Short-term milestones must be today or in the future."
                    );
                    return false;
                }
                if (d > deadlineDate) {
                    setError(
                        "Short-term milestones must be on or before the main goal deadline."
                    );
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSaving(true);
            const payload = {
                specific: specific.trim(),
                achievable,
                relevant,
                deadline,
                linkedJobId,
                shortTermGoals: shortTerms.map(st => ({
                    title: st.title.trim(),
                    deadline: st.deadline,
                    linkedJobId: linkedJobId || null
                }))
            };

            await createGoal(payload);
            navigate("/analytics/goal-tracking");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to create goal");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-6">
            <h1 className="text-3xl font-bold text-(--brand-navy) mb-2">
                Create SMART Goal
            </h1>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* S */}
                <section className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
                    <h2 className="text-xl font-semibold text-(--brand-navy)">
                        S — Specific: What is my goal?
                    </h2>
                    <textarea
                        value={specific}
                        onChange={(e) => setSpecific(e.target.value)}
                        className="w-full form-input min-h-[80px]"
                        placeholder="Example: Secure a full-time software engineering role at a mid-size tech company."
                    />
                </section>

                {/* M */}
                <section className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
                    <h2 className="text-xl font-semibold text-(--brand-navy)">
                        M — Measurable: How will you track your progress?
                    </h2>
                    <textarea
                        value={measurableText}
                        disabled
                        className="w-full form-input min-h-[60px] bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                        OnTrack will track your applications, interviews, and milestones
                        automatically.
                    </p>
                </section>

                {/* A */}
                <section className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
                    <h2 className="text-xl font-semibold text-(--brand-navy)">
                        A — Achievable: Is your goal realistic?
                    </h2>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={achievable}
                            onChange={(e) => setAchievable(e.target.checked)}
                        />
                        <span>I believe this goal is realistic given my skills and timeline.</span>
                    </label>
                </section>

                {/* R */}
                <section className="bg-white border rounded-xl shadow-sm p-5 space-y-2">
                    <h2 className="text-xl font-semibold text-(--brand-navy)">
                        R — Relevant: Does the goal align with your overall plan?
                    </h2>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={relevant}
                            onChange={(e) => setRelevant(e.target.checked)}
                        />
                        <span>This goal supports my long-term career direction.</span>
                    </label>
                </section>

                {/* T + short-term goals */}
                <section className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-(--brand-navy)">
                            T — Time Bound: Give your goal a deadline
                        </h2>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="form-input"
                        />
                        <p className="text-xs text-gray-500">
                            Choose when you want to fully achieve this goal.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-(--brand-navy)">
                                Short-Term Milestones
                            </h3>
                            <button
                                type="button"
                                onClick={addShortTerm}
                                className="text-sm text-blue-700 hover:underline"
                            >
                                + Add short-term goal
                            </button>
                        </div>

                        {shortTerms.length === 0 && (
                            <p className="text-xs text-gray-500">
                                Break your long-term goal into smaller steps to stay motivated.
                            </p>
                        )}

                        <div className="space-y-3">
                            {shortTerms.map((st, idx) => (
                                <div
                                    key={st.id}
                                    className="border rounded-lg p-3 flex flex-col gap-2 bg-gray-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">
                                            Short-Term Goal #{idx + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeShortTerm(st.id)}
                                            className="text-xs text-red-600 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={st.title}
                                        onChange={(e) =>
                                            updateShortTerm(st.id, "title", e.target.value)
                                        }
                                        className="form-input text-sm"
                                        placeholder="Example: Apply to 10 roles and get 2 phone screens."
                                    />
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>Deadline:</span>
                                        <input
                                            type="date"
                                            value={st.deadline}
                                            onChange={(e) =>
                                                updateShortTerm(st.id, "deadline", e.target.value)
                                            }
                                            className="form-input text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate("/analytics/goal-tracking")}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !achievable || !relevant}
                        className="px-5 py-2 rounded-lg bg-(--brand-navy) text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : "Save SMART Goal"}
                    </button>
                </div>
            </form>
        </div>
    );
}