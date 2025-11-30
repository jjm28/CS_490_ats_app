import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type {
  WellbeingSupportOverview,
  WeeklyWellbeingSupportStats,
} from "../../types/support.types";

const WELLBEING_SUPPORT_ENDPOINT = `${API_BASE}/api/supporters/wellbeing-support`;
const WELLBEING_CHECKINS_ENDPOINT = `${API_BASE}/api/supporters/wellbeing-checkins`;

interface Props {
  userId: string;
}

export default function WellbeingSupportPanel({ userId }: Props) {
  const [overview, setOverview] = useState<WellbeingSupportOverview | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // check-in form state
  const [checkinStress, setCheckinStress] = useState<number | "">("");
  const [checkinMood, setCheckinMood] = useState<number | "">("");
  const [checkinNote, setCheckinNote] = useState("");

  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<string | null>(null);

  // reset plan edit state
  const [resetPlanDraft, setResetPlanDraft] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${WELLBEING_SUPPORT_ENDPOINT}/overview?userId=${userId}&weeks=4`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load wellbeing overview");
        }
        const data: WellbeingSupportOverview = await res.json();
        setOverview(data);
        setResetPlanDraft(data.resetPlan || "");
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error loading wellbeing overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [userId]);

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinSuccess(null);
    setError(null);

    if (!checkinStress || !checkinMood) {
      setError("Please select both stress and mood levels.");
      return;
    }

    try {
      setCheckinSubmitting(true);
      const res = await fetch(
        `${WELLBEING_CHECKINS_ENDPOINT}?userId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            stressLevel: Number(checkinStress),
            moodLevel: Number(checkinMood),
            note: checkinNote || undefined,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save check-in");
      }

      setCheckinStress("");
      setCheckinMood("");
      setCheckinNote("");
      setCheckinSuccess("Check-in saved.");
      // refresh overview
      const overviewRes = await fetch(
        `${WELLBEING_SUPPORT_ENDPOINT}/overview?userId=${userId}&weeks=4`,
        { credentials: "include" }
      );
      if (overviewRes.ok) {
        const data: WellbeingSupportOverview = await overviewRes.json();
        setOverview(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving check-in");
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const handleSavePlan = async () => {
    setPlanSuccess(null);
    setError(null);

    try {
      setPlanSaving(true);
      const res = await fetch(
        `${WELLBEING_SUPPORT_ENDPOINT}/plan?userId=${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ resetPlan: resetPlanDraft }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save plan");
      }

      const data = await res.json();
      setPlanSuccess("Saved your reset plan.");
      setOverview((prev) =>
        prev
          ? { ...prev, resetPlan: data.resetPlan || "" }
          : prev
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving reset plan");
    } finally {
      setPlanSaving(false);
    }
  };

  const currentWeek = overview?.currentWeek || null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-sm">Well-being &amp; Support</h2>
          <p className="text-xs text-gray-600">
            Track your stress and mood, and see how using your support network
            lines up with your job search.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-600">Loading well-being overview…</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : overview ? (
        <>
          {/* Current week snapshot */}
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="font-semibold mb-1">This week at a glance</div>
              {currentWeek && currentWeek.hasCheckins ? (
                <div className="space-y-1 text-gray-700">
                  <div>
                    Stress (avg):{" "}
                    {currentWeek.avgStressLevel
                      ? currentWeek.avgStressLevel.toFixed(1)
                      : "–"}{" "}
                    / 5
                  </div>
                  <div>
                    Mood (avg):{" "}
                    {currentWeek.avgMoodLevel
                      ? currentWeek.avgMoodLevel.toFixed(1)
                      : "–"}{" "}
                    / 5
                  </div>
                  <div>
                    Support activity:{" "}
                    {currentWeek.numSupportUpdates +
                      currentWeek.numMilestones}{" "}
                    {currentWeek.numSupportUpdates +
                      currentWeek.numMilestones ===
                    1
                      ? "interaction"
                      : "interactions"}
                  </div>
                  <div>
                    Applications: {currentWeek.numApplications} | Interviews:{" "}
                    {currentWeek.numInterviews} | Offers:{" "}
                    {currentWeek.numOffers}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  No check-ins yet this week. A quick check-in takes just a few
                  seconds.
                </p>
              )}
            </div>

            {/* Quick check-in */}
            <div>
              <div className="font-semibold mb-1">
                Quick check-in for today
              </div>
              <form
                onSubmit={handleCheckinSubmit}
                className="space-y-2 text-xs"
              >
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] mb-1">
                      Stress level (1 = low, 5 = high)
                    </label>
                    <select
                      className="w-full border rounded px-2 py-1 text-xs"
                      value={checkinStress}
                      onChange={(e) =>
                        setCheckinStress(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                    >
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] mb-1">
                      Mood (1 = low, 5 = high)
                    </label>
                    <select
                      className="w-full border rounded px-2 py-1 text-xs"
                      value={checkinMood}
                      onChange={(e) =>
                        setCheckinMood(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                    >
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <textarea
                    className="w-full border rounded px-2 py-1 text-xs"
                    rows={2}
                    placeholder="Optional short note (e.g., OA day, big interview week, taking a rest day)…"
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                  />
                </div>
                {checkinSuccess && (
                  <p className="text-[11px] text-green-600">
                    {checkinSuccess}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={checkinSubmitting}>
                    {checkinSubmitting ? "Saving…" : "Save check-in"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Reset plan editor */}
            <div>
              <div className="font-semibold mb-1">Your reset / coping plan</div>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs"
                rows={4}
                placeholder="E.g., When I notice stress getting high:
- I’ll cap my applications for the day
- I’ll take one no-job-talk evening
- I’ll ask a supporter if I can vent or get encouragement"
                value={resetPlanDraft}
                onChange={(e) => {
                  setPlanSuccess(null);
                  setResetPlanDraft(e.target.value);
                }}
              />
              <div className="flex justify-end mt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSavePlan}
                  disabled={planSaving}
                >
                  {planSaving ? "Saving…" : "Save plan"}
                </Button>
              </div>
              {planSuccess && (
                <p className="text-[11px] text-green-600 mt-1">
                  {planSuccess}
                </p>
              )}
            </div>
          </div>

          {/* Weekly trend list */}
          <div className="border-t pt-3">
            <div className="font-semibold text-xs mb-1">
              Last few weeks at a glance
            </div>
            {overview.weeklyTrend.length === 0 ? (
              <p className="text-xs text-gray-600">
                Once you have a few check-ins, you&apos;ll see weekly trends
                here.
              </p>
            ) : (
              <ul className="text-xs text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                {overview.weeklyTrend.map(
                  (w: WeeklyWellbeingSupportStats, idx: number) => (
                    <li key={idx}>
                      <span className="font-medium">
                        {new Date(w.weekStart).toLocaleDateString()}
                      </span>
                      {": "}
                      {w.hasCheckins ? (
                        <>
                          Stress{" "}
                          {w.avgStressLevel
                            ? w.avgStressLevel.toFixed(1)
                            : "–"}
                          , Mood{" "}
                          {w.avgMoodLevel
                            ? w.avgMoodLevel.toFixed(1)
                            : "–"}
                          , Support interactions{" "}
                          {w.numSupportUpdates + w.numMilestones}, Apps{" "}
                          {w.numApplications}, Interviews {w.numInterviews},
                          Offers {w.numOffers}
                        </>
                      ) : (
                        <>No check-ins logged</>
                      )}
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

          {/* Simple insight */}
          {overview.simpleInsight && (
            <div className="border-t pt-2">
              <div className="font-semibold text-xs mb-1">
                Reflection on support &amp; stress
              </div>
              <p className="text-xs text-gray-700">
                {overview.simpleInsight}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-600">
          No well-being data yet. A quick check-in will get things started.
        </p>
      )}
    </Card>
  );
}
