import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type { WellbeingCheckin } from "../../types/support.types";

const WELLBEING_ENDPOINT = `${API_BASE}/api/supporters/wellbeing`;

interface Props {
  userId: string;
}

export default function WellbeingCheckinPanel({ userId }: Props) {
  const [stressLevel, setStressLevel] = useState(3);
  const [moodLevel, setMoodLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [note, setNote] = useState("");
  const [recentCheckins, setRecentCheckins] = useState<WellbeingCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckins = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${WELLBEING_ENDPOINT}/checkins?userId=${userId}&days=14`,
          { credentials: "include" }
        );
        if (res.ok) {
          const list: WellbeingCheckin[] = await res.json();
          setRecentCheckins(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCheckins();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${WELLBEING_ENDPOINT}/checkins?userId=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            stressLevel,
            moodLevel,
            energyLevel,
            note: note.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save check-in");
      }
      const created: WellbeingCheckin = await res.json();
      setRecentCheckins((prev) => [created, ...prev].slice(0, 10));
      setNote("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Well-being check-in</h2>
          <p className="text-xs text-gray-600">
            Track how you&apos;re feeling during the job search. This data can
            optionally be shared with supporters in a summarized form.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <SliderField
              label="Stress (1–5)"
              value={stressLevel}
              onChange={(v) => setStressLevel(v)}
            />
            <SliderField
              label="Mood (1–5)"
              value={moodLevel}
              onChange={(v) => setMoodLevel(v)}
            />
            <SliderField
              label="Energy (1–5)"
              value={energyLevel}
              onChange={(v) => setEnergyLevel(v)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Optional note
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-xs"
              rows={2}
              placeholder="E.g., 'OA grind today. Tired but making progress.'"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save check-in"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs">Recent check-ins</h3>
          {loading && (
            <span className="text-[10px] text-gray-500">
              Loading…
            </span>
          )}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
          {recentCheckins.length === 0 ? (
            <p className="text-gray-600">
              No check-ins yet. Try logging how you feel once or twice a week.
            </p>
          ) : (
            recentCheckins.map((c) => (
              <div
                key={c._id}
                className="border rounded px-2 py-1 flex justify-between"
              >
                <div>
                  <div>
                    <span className="font-semibold">Stress:</span>{" "}
                    {c.stressLevel} / 5,{" "}
                    <span className="font-semibold">Mood:</span>{" "}
                    {c.moodLevel} / 5
                  </div>
                  {c.note && (
                    <div className="text-[11px] text-gray-600 truncate max-w-xs">
                      {c.note}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 ml-2">
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium">{label}</label>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="text-gray-700">Current: {value}</span>
    </div>
  );
}
