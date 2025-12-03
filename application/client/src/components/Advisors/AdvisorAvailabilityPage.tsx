import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorAvailability,
  AdvisorBillingSettings,
} from "../../types/advisors.types";

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
  const [savingAvailability, setSavingAvailability] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTypesInput, setSessionTypesInput] =
    useState("");

  // NEW: billing state
  const [billing, setBilling] =
    useState<AdvisorBillingSettings | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] =
    useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!advisorUserId) return;
      try {
        setLoading(true);
        setBillingLoading(true);
        setError(null);
        setBillingError(null);

        const [availRes, billingRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/advisors/me/availability?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
          fetch(
            `${API_BASE}/api/advisors/me/billing-settings?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
        ]);

        if (!availRes.ok) {
          const body = await availRes.json().catch(() => ({}));
          throw new Error(
            body?.error ||
              "Failed to load availability"
          );
        }

        const availJson =
          (await availRes.json()) as AdvisorAvailability;
        setAvailability(availJson);
        setSessionTypesInput(
          (availJson.sessionTypes || []).join(", ")
        );

        if (billingRes.ok) {
          const billJson =
            (await billingRes.json()) as AdvisorBillingSettings;
          setBilling(billJson);
        } else {
          // If billing not configured yet, use a sensible default
          setBilling({
            isPaidCoach: false,
            rateAmount: 0,
            currency: "USD",
          });
        }
      } catch (err: any) {
        console.error("Error loading availability/billing:", err);
        setError(
          err.message || "Failed to load availability"
        );
      } finally {
        setLoading(false);
        setBillingLoading(false);
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

  const handleSaveAvailability = async () => {
    if (!advisorUserId || !availability) return;
    setSavingAvailability(true);
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
      setSavingAvailability(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!advisorUserId || !billing) return;
    setBillingSaving(true);
    setBillingError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/me/billing-settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            advisorUserId,
            isPaidCoach: billing.isPaidCoach,
            rateAmount: billing.rateAmount,
            currency: billing.currency,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to save billing settings"
        );
      }

      const updated =
        (await res.json()) as AdvisorBillingSettings;
      setBilling(updated);
    } catch (err: any) {
      console.error("Error saving billing settings:", err);
      setBillingError(
        err.message || "Failed to save billing settings"
      );
    } finally {
      setBillingSaving(false);
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
          {/* Weekly availability */}
          <Card className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">
                Weekly availability
              </h2>
              <Button
                type="button"
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
              >
                {savingAvailability
                  ? "Saving..."
                  : "Save changes"}
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

          {/* Session types */}
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

          {/* NEW: Billing settings */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Billing &amp; rates
              </h2>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveBilling}
                disabled={billingSaving || billingLoading}
              >
                {billingSaving
                  ? "Saving..."
                  : "Save billing"}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Set whether you charge for sessions and your
              default rate. We&apos;ll attach this to each new
              booking.
            </p>

            {billingError && (
              <p className="text-xs text-red-600">
                {billingError}
              </p>
            )}

            {billingLoading ? (
              <p className="text-sm">Loading billing...</p>
            ) : billing ? (
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={billing.isPaidCoach}
                    onChange={(e) =>
                      setBilling((prev) =>
                        prev
                          ? {
                              ...prev,
                              isPaidCoach: e.target.checked,
                            }
                          : {
                              isPaidCoach: e.target.checked,
                              rateAmount: 0,
                              currency: "USD",
                            }
                      )
                    }
                  />
                  <span>
                    I offer paid coaching sessions
                  </span>
                </label>

                {billing.isPaidCoach && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Default rate
                      </span>
                      <select
                        value={billing.currency}
                        onChange={(e) =>
                          setBilling((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  currency: e.target.value,
                                }
                              : null
                          )
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={billing.rateAmount}
                        onChange={(e) =>
                          setBilling((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  rateAmount:
                                    Number(
                                      e.target.value
                                    ) || 0,
                                }
                              : null
                          )
                        }
                        className="border rounded px-2 py-1 text-xs w-24"
                      />
                      <span className="text-xs text-gray-500">
                        per session
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}
