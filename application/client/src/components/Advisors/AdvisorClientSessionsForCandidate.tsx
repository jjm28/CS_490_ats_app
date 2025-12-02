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
  ownerUserId: string;
  advisorUserId: string;
}

export default function AdvisorClientSessionsForCandidate({
  relationshipId,
  ownerUserId,
  advisorUserId,
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
          `${API_BASE}/api/advisors/clients/${relationshipId}/sessions?role=candidate&userId=${encodeURIComponent(
            ownerUserId
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

    if (relationshipId && ownerUserId) {
      fetchSessions();
    }
  }, [relationshipId, ownerUserId]);

  const handleCreated = (s: AdvisorSession) => {
    setSessions((prev) => [...prev, s].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    ));
  };

  const cancelSession = async (s: AdvisorSession) => {
    setUpdatingId(s.id);
    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/sessions/${s.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role: "candidate",
            userId: ownerUserId,
            status: "canceled",
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ||
            "Failed to cancel session"
        );
      }

      const updated =
        (await res.json()) as AdvisorSession;
      setSessions((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch (err: any) {
      console.error("Error canceling session:", err);
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
            Book session
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
                  No upcoming sessions. Book one to get time
                  with your advisor.
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
                      <div className="flex justify-between gap-2">
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
                            {s.status === "requested"
                              ? "Pending advisor confirmation"
                              : "Confirmed"}
                          </div>
                          {renderBillingLine(s)}
                        </div>
                        {s.status !== "canceled" && (
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={() => cancelSession(s)}
                            disabled={updatingId === s.id}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      {s.note && (
                        <p className="text-xs text-gray-700">
                          Your note: {s.note}
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
                      {renderBillingLine(s)}
                      {s.note && (
                        <p className="text-xs text-gray-700">
                          Your note: {s.note}
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
          role="candidate"
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

