import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import type {
  AdvisorClientMaterials,
  AdvisorRecommendation,
  AdvisorRecommendationStatus,
} from "../../types/advisors.types";
import AdvisorRecommendationModal from "./AdvisorRecommendationModal";

interface Props {
  relationshipId: string;
  advisorUserId: string;
}

function groupByStatus(recs: AdvisorRecommendation[]) {
  const groups: Record<AdvisorRecommendationStatus, AdvisorRecommendation[]> =
    {
      pending: [],
      in_progress: [],
      completed: [],
      declined: [],
    };
  recs.forEach((r) => {
    groups[r.status].push(r);
  });
  return groups;
}

export default function AdvisorClientRecommendationsSection({
  relationshipId,
  advisorUserId,
}: Props) {
  const [recommendations, setRecommendations] = useState<
    AdvisorRecommendation[]
  >([]);
  const [materials, setMaterials] =
    useState<AdvisorClientMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  const grouped = useMemo(
    () => groupByStatus(recommendations),
    [recommendations]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load materials (for linking) + recommendations in parallel
        const [matRes, recRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/advisors/clients/${relationshipId}/materials?advisorUserId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
          fetch(
            `${API_BASE}/api/advisors/clients/${relationshipId}/recommendations?role=advisor&userId=${encodeURIComponent(
              advisorUserId
            )}`,
            { credentials: "include" }
          ),
        ]);

        if (!matRes.ok) {
          const body = await matRes.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load client materials"
          );
        }
        if (!recRes.ok) {
          const body = await recRes.json().catch(() => ({}));
          throw new Error(
            body?.error || "Failed to load recommendations"
          );
        }

        const materialsJson =
          (await matRes.json()) as AdvisorClientMaterials;
        const recsJson =
          (await recRes.json()) as AdvisorRecommendation[];

        setMaterials(materialsJson);
        setRecommendations(recsJson);
      } catch (err: any) {
        console.error(
          "Error loading advisor recommendations/materials:",
          err
        );
        setError(
          err.message ||
            "Failed to load recommendations or materials"
        );
      } finally {
        setLoading(false);
      }
    };

    if (relationshipId && advisorUserId) {
      fetchData();
    }
  }, [relationshipId, advisorUserId]);

  const handleCreated = (rec: AdvisorRecommendation) => {
    setRecommendations((prev) => [rec, ...prev]);
  };

  const updateStatus = async (
    rec: AdvisorRecommendation,
    status: AdvisorRecommendationStatus
  ) => {
    if (rec.status === status) return;
    setUpdatingId(rec.id);

    try {
      const res = await fetch(
        `${API_BASE}/api/advisors/recommendations/${rec.id}`,
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
          body?.error || "Failed to update status"
        );
      }

      const updated =
        (await res.json()) as AdvisorRecommendation;
      setRecommendations((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err: any) {
      console.error("Error updating status:", err);
      // optional: toast
    } finally {
      setUpdatingId(null);
    }
  };

  const renderLinkBadge = (rec: AdvisorRecommendation) => {
    if (rec.category === "job" && rec.jobId && materials?.applications) {
      const job = materials.applications.jobs.find(
        (j) => j.id === rec.jobId
      );
      if (job) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">
            Job: {job.jobTitle} @ {job.company}
          </span>
        );
      }
    }

    if (
      rec.category === "resume" &&
      rec.resumeId &&
      materials?.documents
    ) {
      const r = materials.documents.resumes.find(
        (x) => x.id === rec.resumeId
      );
      if (r) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">
            Resume: {r.filename}
          </span>
        );
      }
    }

    if (
      rec.category === "cover_letter" &&
      rec.coverLetterId &&
      materials?.documents
    ) {
      const c = materials.documents.coverLetters.find(
        (x) => x.id === rec.coverLetterId
      );
      if (c) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]">
            Cover letter: {c.filename}
          </span>
        );
      }
    }

    return null;
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

  const statusClasses = (s: AdvisorRecommendationStatus) => {
    switch (s) {
      case "pending":
        return "bg-yellow-50 text-yellow-700";
      case "in_progress":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-green-50 text-green-700";
      case "declined":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm">Loading recommendations...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <>
        <Card className="p-4 bg-red-50 text-red-700 mb-4">
          <p className="text-sm">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Advisor recommendations
          </h2>
          <Button
            type="button"
            onClick={() => setShowModal(true)}
            size="sm"
          >
            + Add recommendation
          </Button>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-xs text-gray-500">
            You haven&apos;t added any recommendations for this client yet.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {/* Open (pending + in_progress) */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-gray-700 mb-1">
                Open
              </h3>
              {grouped.pending.concat(grouped.in_progress).length === 0 ? (
                <p className="text-xs text-gray-500">
                  No open recommendations.
                </p>
              ) : (
                grouped.pending
                  .concat(grouped.in_progress)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="border rounded px-3 py-2 space-y-1"
                    >
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {rec.title}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {rec.category}
                          </div>
                        </div>
                        <select
                          value={rec.status}
                          disabled={updatingId === rec.id}
                          onChange={(e) =>
                            updateStatus(
                              rec,
                              e.target.value as AdvisorRecommendationStatus
                            )
                          }
                          className={`text-[11px] px-2 py-1 rounded border ${statusClasses(
                            rec.status
                          )}`}
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

                      {renderLinkBadge(rec) && (
                        <div>{renderLinkBadge(rec)}</div>
                      )}

                      {rec.description && (
                        <p className="text-xs text-gray-700">
                          {rec.description}
                        </p>
                      )}

                      {rec.candidateNote && (
                        <p className="text-[11px] text-gray-500">
                          Candidate note: {rec.candidateNote}
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>

            {/* Completed / Declined */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-gray-700 mb-1">
                Completed / Declined
              </h3>
              {grouped.completed.concat(grouped.declined).length === 0 ? (
                <p className="text-xs text-gray-500">
                  No completed or declined recommendations yet.
                </p>
              ) : (
                grouped.completed
                  .concat(grouped.declined)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="border rounded px-3 py-2 space-y-1 bg-gray-50"
                    >
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {rec.title}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {statusLabel(rec.status)} ·{" "}
                            {rec.completedAt
                              ? new Date(
                                  rec.completedAt
                                ).toLocaleDateString()
                              : new Date(
                                  rec.createdAt
                                ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {renderLinkBadge(rec) && (
                        <div>{renderLinkBadge(rec)}</div>
                      )}

                      {rec.description && (
                        <p className="text-xs text-gray-700">
                          {rec.description}
                        </p>
                      )}

                      {rec.candidateNote && (
                        <p className="text-[11px] text-gray-500">
                          Candidate note: {rec.candidateNote}
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </Card>

      {showModal && (
        <AdvisorRecommendationModal
          relationshipId={relationshipId}
          advisorUserId={advisorUserId}
          materials={materials}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
