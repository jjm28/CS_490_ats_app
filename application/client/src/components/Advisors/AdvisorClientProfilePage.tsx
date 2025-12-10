// components/AdvisorPortal/AdvisorClientProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type {
  AdvisorClientProfile,
  AdvisorRelationshipImpact,
} from "../../types/advisors.types";
import AdvisorClientMaterialsSection from "./AdvisorClientMaterialsSection";
import AdvisorClientRecommendationsSection from "./AdvisorClientRecommendationsSection";
import AdvisorClientSessionsSection from "./AdvisorClientSessionsSection";

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

export default function AdvisorClientProfilePage() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const [profile, setProfile] = useState<AdvisorClientProfile | null>(null);
  const [impact, setImpact] =
    useState<AdvisorRelationshipImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [impactLoading, setImpactLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const navigate = useNavigate();
  const advisorUserId = getCurrentUserId();

  useEffect(() => {
    if (!advisorUserId || !relationshipId) {
      setLoading(false);
      setError("Missing advisor or relationship id.");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/profile?advisorUserId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load client profile");
        }
        const data = (await res.json()) as AdvisorClientProfile;
        setProfile(data);
      } catch (err: any) {
        console.error("Error loading client profile:", err);
        setError(err.message || "Failed to load client profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [advisorUserId, relationshipId]);

  useEffect(() => {
    if (!advisorUserId || !relationshipId) {
      setImpactLoading(false);
      return;
    }

    const fetchImpact = async () => {
      try {
        setImpactLoading(true);
        setImpactError(null);

        const res = await fetch(
          `${API_BASE}/api/advisors/clients/${relationshipId}/impact?advisorUserId=${encodeURIComponent(
            advisorUserId
          )}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load impact");
        }

        const data = (await res.json()) as AdvisorRelationshipImpact;
        setImpact(data);
      } catch (err: any) {
        console.error("Error loading impact:", err);
        setImpactError(err.message || "Failed to load impact summary");
      } finally {
        setImpactLoading(false);
      }
    };

    fetchImpact();
  }, [advisorUserId, relationshipId]);

  // Missing ids state
  if (!relationshipId || !advisorUserId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-4 bg-red-50 border border-red-100">
          <p className="text-sm text-red-700">
            Missing advisor or relationship id.
          </p>
        </Card>
      </div>
    );
  }

  // Loading state for main profile
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Loading client…</p>
        </Card>
      </div>
    );
  }

  // Error state for main profile
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-4 bg-red-50 border border-red-100">
          <p className="text-sm text-red-700">
            {error || "Could not load client"}
          </p>
        </Card>
      </div>
    );
  }

  const basic = profile?.basicProfile;
  const jobSummary = profile?.jobSummary;

  const candidateName =
    basic?.fullName || "Unnamed candidate";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header with back link + candidate name */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline"
          onClick={() => navigate("/advisor/clients")}
        >
          ← Back to clients
        </button>
        <div className="text-right sm:text-left">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Client workspace
          </p>
          <p className="text-base font-semibold text-gray-900">
            {candidateName}
          </p>
          {basic?.headline && (
            <p className="text-xs text-gray-500">
              {basic.headline}
            </p>
          )}
        </div>
      </div>

      {/* Candidate overview */}
      {basic && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Candidate overview
            </h2>
          </div>

          {basic.bio && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {basic.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {basic.industry && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">
                <span className="font-medium mr-1">Industry:</span>
                {basic.industry}
              </span>
            )}
            {basic.experienceLevel && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">
                <span className="font-medium mr-1">Experience:</span>
                {basic.experienceLevel}
              </span>
            )}
            {basic.location && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">
                <span className="font-medium mr-1">Location:</span>
                {[
                  basic.location.city,
                  basic.location.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Job search summary */}
      {jobSummary && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Job search summary
            </h2>
            <p className="text-xs text-gray-500">
              Total tracked opportunities:{" "}
              <span className="font-semibold">
                {jobSummary.totalJobs}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-700">
            {Object.entries(jobSummary.statusCounts || {}).map(
              ([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-0.5 rounded-full bg-gray-100"
                >
                  {status}: {count}
                </span>
              )
            )}
          </div>

          {jobSummary.topJobs.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <h3 className="text-xs font-semibold text-gray-900">
                Recent opportunities
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {jobSummary.topJobs.map((job) => (
                  <li key={job.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {job.jobTitle}
                    </span>
                    <span className="text-gray-500">
                      at {job.company}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {job.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Impact card */}
      {!impactLoading && !impactError && impact && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Your impact on this search
            </h2>
            <p className="text-xs text-gray-500">
              Based on shared jobs, recommendations, and sessions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs you can see
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.sharedJobCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs at interview stage
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.sharedJobsAtInterviewStage}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs with offers
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.sharedJobsWithOffers}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Completed recommendations
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.completedRecommendations}/
                {impact.totalRecommendations}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Completed sessions
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.completedSessions}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Upcoming sessions
              </div>
              <div className="mt-0.5 font-medium text-gray-900">
                {impact.upcomingSessions}
              </div>
            </div>
          </div>
        </Card>
      )}

      {impactError && (
        <Card className="p-4 bg-yellow-50 border border-yellow-100">
          <p className="text-xs text-yellow-800">
            {impactError}
          </p>
        </Card>
      )}

      {!basic && !jobSummary && (
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-gray-600">
            This candidate hasn’t shared any profile or job summary details with you yet.
          </p>
        </Card>
      )}

      {profile && (
        <>
          <AdvisorClientMaterialsSection
            relationshipId={relationshipId || ""}
            advisorUserId={advisorUserId}
          />
          <AdvisorClientRecommendationsSection
            relationshipId={relationshipId || ""}
            advisorUserId={advisorUserId}
          />
          <AdvisorClientSessionsSection
            relationshipId={relationshipId || ""}
            advisorUserId={advisorUserId}
            ownerUserId={profile.ownerUserId} // use ownerUserId from profile
          />
        </>
      )}
    </div>
  );
}
