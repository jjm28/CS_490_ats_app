// components/Advisors/AdvisorSessionsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type { AdvisorRelationshipSummary } from "../../types/advisors.types";
import AdvisorClientSessionsForCandidate from "./AdvisorClientSessionsForCandidate";
import Button from "../StyledComponents/Button";

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

export default function AdvisorSessionsPage() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const navigate = useNavigate();
  const ownerUserId = getCurrentUserId();

  const [advisors, setAdvisors] = useState<AdvisorRelationshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerUserId) {
      setLoading(false);
      setError("You must be logged in to view advisor sessions.");
      return;
    }

    const fetchAdvisors = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors?ownerUserId=${encodeURIComponent(
            ownerUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load advisors");
        }

        const data = (await res.json()) as AdvisorRelationshipSummary[];
        setAdvisors(data);
      } catch (err: any) {
        console.error("Error loading advisors for sessions:", err);
        setError(err.message || "Failed to load advisors");
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisors();
  }, [ownerUserId]);

  if (!relationshipId || !ownerUserId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-red-600">
          Missing advisor relationship or user. Please log in again.
        </p>
      </div>
    );
  }

  const advisor = advisors.find((a) => a.id === relationshipId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => navigate("/advisors")}
        >
          ← Back to advisors
        </button>
        <h1 className="text-lg font-semibold">Advisor sessions</h1>
      </div>

      {loading && (
        <Card className="p-4">
          <p className="text-sm">Loading advisor information...</p>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-red-50 text-red-700">
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {!loading && !error && !advisor && (
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            We couldn&apos;t find this advisor relationship. It may have been
            revoked or deleted.
          </p>
        </Card>
      )}

      {!loading && !error && advisor && (
        <>
          <Card className="p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {advisor.advisorName || advisor.advisorEmail}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {advisor.advisorType}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  advisor.status === "active"
                    ? "bg-green-100 text-green-700"
                    : advisor.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {advisor.status}
              </span>
            </div>
            {advisor.status !== "active" && (
              <p className="text-xs text-gray-500">
                Sessions will be available once this advisor has accepted your
                invite and activated their account.
              </p>
            )}
          </Card>

          {advisor.status === "active" && advisor.advisorUserId && (
            <AdvisorClientSessionsForCandidate
              relationshipId={relationshipId}
              ownerUserId={ownerUserId}
              advisorUserId={advisor.advisorUserId}
            />
          )}

          {advisor.status === "active" && !advisor.advisorUserId && (
            <Card className="p-4">
              <p className="text-sm text-gray-600">
                This advisor is marked active, but we don&apos;t have their
                account id yet. Try refreshing later or re-sending the invite.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
