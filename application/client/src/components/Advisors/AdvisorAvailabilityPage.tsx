import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type { AdvisorAvailability } from "../../types/advisors.types";

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?._id || null;
  } catch {
    return null;
  }
}

export default function AdvisorAvailabilityPage() {
  const advisorUserId = getCurrentUserId();
  const [availability, setAvailability] =
    useState<AdvisorAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionTypesInput, setSessionTypesInput] =
    useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!advisorUserId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/me/availability?advisorUserId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error ||
              "Failed to load availability"
          );
        }

        const data = (await res.json()) as AdvisorAvailability;
        setAvailability(data);
        setSessionTypesInput(
          (data.sessionTypes || []).join(", ")
        );
      } catch (err: any) {
        console.error("Error loading availability:", err);
        setError(
          err.message || "Failed to load availability"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [advisorUserId]);

  const updateSlot = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setAvailability((prev) => {
      if (!prev) return prev;
      const slots = prev.weeklySlots.filter(
        (s) => s.dayOfWeek === dayOfWeek
      );
      const others = prev.weeklySlots.filter(
        (s) => s.dayOfWeek !== dayOfWeek
      );
      const updated = [...slots];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        weeklySlots: [...others, ...updated],
      };
    });
  };

  const addSlot = (dayOfWeek: number) => {
    setAvailability((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weeklySlots: [
          ...prev.weeklySlots,
          {
            dayOfWeek,
            startTime: "18:00",
            endTime: "19:00",
          },
        ],
      };
    });
  };

  const removeSlot = (dayOfWeek: number, index: number) => {
    setAvailability((prev) => {
      if (!prev) return prev;
      const slots = prev.weeklySlots.filter(
        (s) => s.dayOfWeek === dayOfWeek
      );
      const others = prev.weeklySlots.filter(
        (s) => s.dayOfWeek !== dayOfWeek
      );
      slots.splice(index, 1);
      return {
        ...prev,
        weeklySlots: [...others, ...slots],
      };
    });
  };

  const handleSave = async () => {
    if (!advisorUserId || !availability) return;
    setSaving(true);
    setError(null);

    const sessionTypes = sessionTypesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/me/availability`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            advisorUserId,
            weeklySlots: availability.weeklySlots,
            sessionTypes,
            timezone: availability.timezone,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to save availability"
        );
      }

      const updated =
        (await res.json()) as AdvisorAvailability;
      setAvailability(updated);
      setSessionTypesInput(
        (updated.sessionTypes || []).join(", ")
      );
    } catch (err: any) {
      console.error("Error saving availability:", err);
      setError(err.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  if (!advisorUserId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-red-600">
          Please sign in to manage your availability.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-semibold">
        Availability &amp; sessions
      </h1>

      {loading && (
        <p className="text-sm">Loading availability...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && availability && (
        <>
          <Card className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">
                Weekly availability
              </h2>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Add time ranges for days when you can meet with
              clients. We&apos;ll turn these into 30-minute slots
              candidates can book.
            </p>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {dayLabels.map((label, idx) => {
                const daySlots =
                  availability.weeklySlots
                    .filter(
                      (s) => s.dayOfWeek === idx
                    )
                    .sort(
                      (a, b) =>
                        a.startTime.localeCompare(b.startTime)
                    ) || [];
                return (
                  <div
                    key={idx}
                    className="border rounded p-3 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {label}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addSlot(idx)}
                      >
                        + Add
                      </Button>
                    </div>
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No availability set.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((s, i) => (
                          <div
                            key={`${idx}-${i}`}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="time"
                              value={s.startTime}
                              onChange={(e) =>
                                updateSlot(
                                  idx,
                                  i,
                                  "startTime",
                                  e.target.value
                                )
                              }
                              className="border rounded px-2 py-1 text-xs"
                            />
                            <span className="text-xs">
                              -
                            </span>
                            <input
                              type="time"
                              value={s.endTime}
                              onChange={(e) =>
                                updateSlot(
                                  idx,
                                  i,
                                  "endTime",
                                  e.target.value
                                )
                              }
                              className="border rounded px-2 py-1 text-xs"
                            />
                            <button
                              type="button"
                              className="text-xs text-red-500"
                              onClick={() =>
                                removeSlot(idx, i)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              Session types
            </h2>
            <p className="text-xs text-gray-500">
              List the kinds of sessions you offer, separated by
              commas. For example: &quot;Resume review, Mock
              interview, Career strategy&quot;
            </p>
            <input
              type="text"
              value={sessionTypesInput}
              onChange={(e) =>
                setSessionTypesInput(e.target.value)
              }
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Resume review, Mock interview, Career strategy"
            />
          </Card>
        </>
      )}
    </div>
  );
}
