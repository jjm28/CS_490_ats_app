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
  const [profile, setProfile] =
    useState<AdvisorClientProfile | null>(null);
  const [impact, setImpact] =
    useState<AdvisorRelationshipImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [impactLoading, setImpactLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impactError, setImpactError] =
    useState<string | null>(null);
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
          throw new Error(
            body?.error || "Failed to load client profile"
          );
        }
        const data =
          (await res.json()) as AdvisorClientProfile;
        setProfile(data);
      } catch (err: any) {
        console.error("Error loading client profile:", err);
        setError(
          err.message || "Failed to load client profile"
        );
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
          throw new Error(
            body?.error || "Failed to load impact"
          );
        }

        const data =
          (await res.json()) as AdvisorRelationshipImpact;
        setImpact(data);
      } catch (err: any) {
        console.error("Error loading impact:", err);
        setImpactError(
          err.message || "Failed to load impact summary"
        );
      } finally {
        setImpactLoading(false);
      }
    };

    fetchImpact();
  }, [advisorUserId, relationshipId]);

  if (!relationshipId || !advisorUserId) {
    return (
      <p className="p-4 text-sm text-red-600">
        Missing ids
      </p>
    );
  }

  if (loading) {
    return (
      <p className="p-4 text-sm">Loading client...</p>
    );
  }

  if (error) {
    return (
      <p className="p-4 text-sm text-red-600">
        {error || "Could not load client"}
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => navigate("/advisor/clients")}
        >
          ← Back to clients
        </button>
      </div>

      {profile && profile.basicProfile && (
        <Card className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">
            Candidate Overview
          </h2>
          <div>
            <p className="font-medium">
              {profile.basicProfile.fullName ||
                "Unnamed candidate"}
            </p>
            {profile.basicProfile.headline && (
              <p className="text-sm text-gray-600">
                {profile.basicProfile.headline}
              </p>
            )}
          </div>
          {profile.basicProfile.bio && (
            <p className="text-sm text-gray-700">
              {profile.basicProfile.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {profile.basicProfile.industry && (
              <span>
                Industry: {profile.basicProfile.industry}
              </span>
            )}
            {profile.basicProfile.experienceLevel && (
              <span>
                Experience:{" "}
                {profile.basicProfile.experienceLevel}
              </span>
            )}
            {profile.basicProfile.location && (
              <span>
                Location:{" "}
                {[
                  profile.basicProfile.location.city,
                  profile.basicProfile.location.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        </Card>
      )}

      {profile && profile.jobSummary && (
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">
            Job Search Summary
          </h2>
          <p className="text-sm text-gray-600">
            Total tracked opportunities:{" "}
            <strong>{profile.jobSummary.totalJobs}</strong>
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {Object.entries(
              profile.jobSummary.statusCounts
            ).map(([status, count]) => (
              <span
                key={status}
                className="px-2 py-0.5 bg-gray-50 rounded-full"
              >
                {status}: {count}
              </span>
            ))}
          </div>

          {profile.jobSummary.topJobs.length > 0 && (
            <div className="border-top pt-3 space-y-2">
              <h3 className="text-sm font-medium">
                Recent opportunities
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {profile.jobSummary.topJobs.map((job) => (
                  <li key={job.id}>
                    <span className="font-medium">
                      {job.jobTitle}
                    </span>{" "}
                    <span className="text-gray-500">
                      at {job.company}
                    </span>{" "}
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {job.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* NEW: Impact card */}
      {!impactLoading && !impactError && impact && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Impact on this search
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs you can see
              </div>
              <div className="font-medium">
                {impact.sharedJobCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs at interview stage
              </div>
              <div className="font-medium">
                {impact.sharedJobsAtInterviewStage}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Shared jobs with offers
              </div>
              <div className="font-medium">
                {impact.sharedJobsWithOffers}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Completed recommendations
              </div>
              <div className="font-medium">
                {impact.completedRecommendations}/
                {impact.totalRecommendations}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Completed sessions
              </div>
              <div className="font-medium">
                {impact.completedSessions}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                Upcoming sessions
              </div>
              <div className="font-medium">
                {impact.upcomingSessions}
              </div>
            </div>
          </div>
        </Card>
      )}
      {impactError && (
        <Card className="p-4 bg-yellow-50 text-yellow-800">
          <p className="text-xs">
            {impactError}
          </p>
        </Card>
      )}

      {!profile?.basicProfile && !profile?.jobSummary && (
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            This candidate hasn’t shared any profile or job
            summary details with you yet.
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
            ownerUserId={profile.ownerUserId} // 🔧 fix: use ownerUserId from profile
          />
        </>
      )}
    </div>
  );
}
