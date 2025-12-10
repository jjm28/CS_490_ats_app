import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorSession,
  AdvisorSessionStatus,
} from "../../types/advisors.types";
import AdvisorScheduleSessionModal from "./AdvisorScheduleSessionModal";

interface Props {
  relationshipId: string;
  advisorUserId: string;
  ownerUserId: string;
}

type AdvisorPaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "untracked";

export default function AdvisorClientSessionsSection({
  relationshipId,
  advisorUserId,
  ownerUserId,
}: Props) {
  const [sessions, setSessions] = useState<AdvisorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/sessions?role=advisor&userId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error ||
              "Failed to load sessions"
          );
        }

        const data = (await res.json()) as AdvisorSession[];
        setSessions(data);
      } catch (err: any) {
        console.error("Error loading sessions:", err);
        setError(
          err.message || "Failed to load sessions"
        );
      } finally {
        setLoading(false);
      }
    };

    if (relationshipId && advisorUserId) {
      fetchSessions();
    }
  }, [relationshipId, advisorUserId]);

  const handleCreated = (s: AdvisorSession) => {
    setSessions((prev) =>
      [...prev, s].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      )
    );
  };

  const updateStatus = async (
    s: AdvisorSession,
    status: AdvisorSessionStatus
  ) => {
    setUpdatingId(s.id);
    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/sessions/${s.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role: "advisor",
            userId: advisorUserId,
            status,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to update session"
        );
      }

      const updated =
        (await res.json()) as AdvisorSession;
      setSessions((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch (err: any) {
      console.error("Error updating session:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const updatePaymentStatus = async (
    s: AdvisorSession,
    paymentStatus: AdvisorPaymentStatus
  ) => {
    setUpdatingId(s.id);
    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/sessions/${s.id}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            advisorUserId,
            paymentStatus,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to update payment"
        );
      }

      const updated =
        (await res.json()) as AdvisorSession;
      setSessions((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch (err: any) {
      console.error("Error updating session payment:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const upcoming = sessions.filter(
    (s) =>
      s.status === "requested" ||
      s.status === "confirmed"
  );
  const past = sessions.filter(
    (s) =>
      s.status === "completed" || s.status === "canceled"
  );

  const renderBillingLine = (s: AdvisorSession) => {
    if (!s.isBillable || !s.rateAmount) return null;
    const label =
      s.paymentStatus === "paid"
        ? "Paid"
        : s.paymentStatus === "pending"
        ? "Payment pending"
        : s.paymentStatus === "refunded"
        ? "Refunded"
        : "Not tracked";
    return (
      <div className="text-[11px] text-gray-500">
        Billing: {s.currency || "USD"} {s.rateAmount.toFixed(2)} ·{" "}
        {label}
      </div>
    );
  };

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">
            Sessions
          </h2>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Schedule session
          </Button>
        </div>

        {loading && (
          <p className="text-sm">Loading sessions...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="text-xs font-medium mb-1">
                Upcoming
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No upcoming sessions.
                </p>
              ) : (
                upcoming.map((s) => {
                  const start = new Date(s.startTime);
                  const end = new Date(s.endTime);
                  return (
                    <div
                      key={s.id}
                      className="border rounded px-3 py-2 space-y-1"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div>
                          <div className="font-medium">
                            {s.sessionType}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {start.toLocaleString()} –{" "}
                            {end.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {s.createdByRole ===
                            "candidate"
                              ? "Requested by client"
                              : "Scheduled by you"}
                          </div>
                          {renderBillingLine(s)}
                        </div>
                        <div className="flex flex-col gap-1">
                          {s.status === "requested" && (
                            <>
                              <Button
                                type="button"
                                size="xs"
                                onClick={() =>
                                  updateStatus(
                                    s,
                                    "confirmed"
                                  )
                                }
                                disabled={
                                  updatingId === s.id
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="secondary"
                                onClick={() =>
                                  updateStatus(
                                    s,
                                    "canceled"
                                  )
                                }
                                disabled={
                                  updatingId === s.id
                                }
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {s.status === "confirmed" && (
                            <>
                              <Button
                                type="button"
                                size="xs"
                                variant="secondary"
                                onClick={() =>
                                  updateStatus(
                                    s,
                                    "canceled"
                                  )
                                }
                                disabled={
                                  updatingId === s.id
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                onClick={() =>
                                  updateStatus(
                                    s,
                                    "completed"
                                  )
                                }
                                disabled={
                                  updatingId === s.id
                                }
                              >
                                Mark completed
                              </Button>
                            </>
                          )}

                          {s.isBillable && (
                            <select
                              className="mt-1 text-[11px] border rounded px-2 py-1 bg-white"
                              value={
                                s.paymentStatus || "untracked"
                              }
                              disabled={updatingId === s.id}
                              onChange={(e) =>
                                updatePaymentStatus(
                                  s,
                                  e.target
                                    .value as AdvisorPaymentStatus
                                )
                              }
                            >
                              <option value="untracked">
                                Not tracked
                              </option>
                              <option value="pending">
                                Payment pending
                              </option>
                              <option value="paid">
                                Paid
                              </option>
                              <option value="refunded">
                                Refunded
                              </option>
                            </select>
                          )}
                        </div>
                      </div>
                      {s.note && (
                        <p className="text-xs text-gray-700">
                          Note: {s.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium mb-1">
                Past
              </h3>
              {past.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No past sessions yet.
                </p>
              ) : (
                past.map((s) => {
                  const start = new Date(s.startTime);
                  return (
                    <div
                      key={s.id}
                      className="border rounded px-3 py-2 space-y-1 bg-gray-50"
                    >
                      <div className="font-medium">
                        {s.sessionType}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {start.toLocaleString()} ·{" "}
                        {s.status}
                      </div>

                      {s.candidateRating && (
                          <div className="text-[11px] text-yellow-700">
                            Client rating: {s.candidateRating}/5
                          </div>
                        )}
                        {s.candidateFeedback && (
                          <p className="text-xs text-gray-700 mt-1">
                            Client feedback: {s.candidateFeedback}
                          </p>
                        )}
                      {renderBillingLine(s)}
                      {s.note && (
                        <p className="text-xs text-gray-700">
                          Note: {s.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Card>

      {showModal && (
        <AdvisorScheduleSessionModal
          role="advisor"
          relationshipId={relationshipId}
          ownerUserId={ownerUserId}
          advisorUserId={advisorUserId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
