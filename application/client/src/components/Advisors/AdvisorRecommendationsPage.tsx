import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorRecommendation,
  AdvisorRecommendationStatus,
} from "../../types/advisors.types";

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

export default function AdvisorRecommendationsPage() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const [recs, setRecs] = useState<AdvisorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        if (!relationshipId || !currentUserId) return;
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/recommendations?role=candidate&userId=${encodeURIComponent(
            currentUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load recommendations"
          );
        }

        const data =
          (await res.json()) as AdvisorRecommendation[];
        setRecs(data);
      } catch (err: any) {
        console.error("Error loading recommendations:", err);
        setError(err.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [relationshipId, currentUserId]);

  const updateRec = async (
    rec: AdvisorRecommendation,
    changes: Partial<AdvisorRecommendation>
  ) => {
    if (!currentUserId) return;
    setUpdatingId(rec.id);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/recommendations/${rec.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role: "candidate",
            userId: currentUserId,
            status: changes.status,
            candidateNote: changes.candidateNote,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || "Failed to update recommendation"
        );
      }

      const updated =
        (await res.json()) as AdvisorRecommendation;
      setRecs((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err: any) {
      console.error("Error updating recommendation:", err);
      // optional: toast
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabel = (s: AdvisorRecommendationStatus) => {
    switch (s) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In progress";
      case "completed":
        return "Completed";
      case "declined":
        return "Declined";
      default:
        return s;
    }
  };

  if (!relationshipId || !currentUserId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-red-600">
          Missing advisor relationship or user. Please log in again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => navigate("/advisors")}
        >
          ← Back to advisors
        </button>
        <h1 className="text-lg font-semibold">
          Advisor recommendations
        </h1>
      </div>

      <Card className="p-4">
        {loading && (
          <p className="text-sm">Loading recommendations...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}

        {!loading && !error && recs.length === 0 && (
          <p className="text-sm text-gray-500">
            You don&apos;t have any recommendations from this advisor yet.
          </p>
        )}

        {!loading && !error && recs.length > 0 && (
          <div className="space-y-3 text-sm">
            {recs.map((rec) => (
              <div
                key={rec.id}
                className="border rounded px-3 py-2 space-y-1"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-[11px] text-gray-500">
                      {rec.category} ·{" "}
                      {new Date(
                        rec.createdAt
                      ).toLocaleDateString()}
                    </div>
                  </div>
                  <select
                    value={rec.status}
                    disabled={updatingId === rec.id}
                    onChange={(e) =>
                      updateRec(rec, {
                        status:
                          e.target
                            .value as AdvisorRecommendationStatus,
                        candidateNote: rec.candidateNote,
                      })
                    }
                    className="text-[11px] px-2 py-1 rounded border bg-white"
                  >
                    <option value="pending">
                      Pending
                    </option>
                    <option value="in_progress">
                      In progress
                    </option>
                    <option value="completed">
                      Completed
                    </option>
                    <option value="declined">
                      Declined
                    </option>
                  </select>
                </div>

                {rec.description && (
                  <p className="text-xs text-gray-700">
                    {rec.description}
                  </p>
                )}

                <div className="mt-1">
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Your note (optional)
                  </label>
                  <textarea
                    value={rec.candidateNote || ""}
                    disabled={updatingId === rec.id}
                    onChange={(e) =>
                      setRecs((prev) =>
                        prev.map((r) =>
                          r.id === rec.id
                            ? {
                                ...r,
                                candidateNote: e.target.value,
                              }
                            : r
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateRec(rec, {
                        status: rec.status,
                        candidateNote: e.target.value,
                      })
                    }
                    className="w-full border rounded px-2 py-1 text-xs min-h-[48px]"
                    placeholder="Add a short note about how/when you used this recommendation."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
