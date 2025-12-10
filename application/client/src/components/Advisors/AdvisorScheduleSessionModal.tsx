import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import type {
  AdvisorAvailability,
  AdvisorSession,
  AdvisorSlot,
} from "../../types/advisors.types";

interface Props {
  role: "advisor" | "candidate";
  relationshipId: string;
  ownerUserId: string; // candidate
  advisorUserId: string;
  onClose: () => void;
  onCreated: (s: AdvisorSession) => void;
}

export default function AdvisorScheduleSessionModal({
  role,
  relationshipId,
  ownerUserId,
  advisorUserId,
  onClose,
  onCreated,
}: Props) {
  const [availability, setAvailability] =
    useState<AdvisorAvailability | null>(null);
  const [slots, setSlots] = useState<AdvisorSlot[]>([]);
  const [sessionType, setSessionType] = useState("");
  const [selectedSlotIndex, setSelectedSlotIndex] =
    useState<number | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createdByUserId =
    role === "advisor" ? advisorUserId : ownerUserId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [availRes, slotsRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/advisors/me/availability?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
          fetch(
            `${API_BASE}/api/advisors/clients/${relationshipId}/slots?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
        ]);

        if (!availRes.ok) {
          const body = await availRes.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load availability"
          );
        }
        if (!slotsRes.ok) {
          const body = await slotsRes.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load slots"
          );
        }

        const availabilityJson =
          (await availRes.json()) as AdvisorAvailability;
        const slotsJson =
          (await slotsRes.json()) as AdvisorSlot[];

        setAvailability(availabilityJson);
        setSlots(slotsJson);
        if (
          availabilityJson.sessionTypes &&
          availabilityJson.sessionTypes.length > 0
        ) {
          setSessionType(availabilityJson.sessionTypes[0]);
        }
      } catch (err: any) {
        console.error("Error loading schedule data:", err);
        setError(
          err.message ||
            "Failed to load schedule data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [advisorUserId, relationshipId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotIndex === null) {
      setError("Please select a time slot");
      return;
    }
    if (!sessionType.trim()) {
      setError("Please choose a session type");
      return;
    }

    const slot = slots[selectedSlotIndex];
    if (!slot) {
      setError("Invalid slot selected");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/clients/${relationshipId}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role,
            createdByUserId,
            ownerUserId,
            advisorUserId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            sessionType,
            note,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to schedule session"
        );
      }

      const created = (await res.json()) as AdvisorSession;
      onCreated(created);
      onClose();
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError(err.message || "Failed to schedule session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={saving}
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-1">
          {role === "advisor"
            ? "Schedule a session"
            : "Book a session"}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Pick a session type and time that works.
        </p>

        {loading && (
          <p className="text-sm">Loading availability...</p>
        )}

        {error && (
          <p className="text-xs text-red-600 mb-2">
            {error}
          </p>
        )}

        {!loading && !error && availability && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 text-sm"
          >
            <div>
              <label className="block text-xs font-medium mb-1">
                Session type
              </label>
              <select
                value={sessionType}
                onChange={(e) =>
                  setSessionType(e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {availability.sessionTypes.length === 0 && (
                  <option value="">
                    No session types set by advisor
                  </option>
                )}
                {availability.sessionTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Time
              </label>
              {slots.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No available slots found for the next couple
                  of weeks. Ask your advisor to update their
                  availability.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                  {slots.map((slot, idx) => {
                    const start = new Date(slot.startTime);
                    const end = new Date(slot.endTime);
                    return (
                      <label
                        key={slot.startTime}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="sessionSlot"
                          value={idx}
                          checked={selectedSlotIndex === idx}
                          onChange={() =>
                            setSelectedSlotIndex(idx)
                          }
                        />
                        <span>
                          {start.toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {start.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {end.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Notes (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm min-h-[70px]"
                placeholder={
                  role === "candidate"
                    ? "What would you like to focus on in this session?"
                    : "Add any context for this session."
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Scheduling..."
                  : role === "advisor"
                  ? "Schedule"
                  : "Request session"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
