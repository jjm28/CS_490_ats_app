// components/AdvisorPortal/AdvisorClientProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Card from "../StyledComponents/Card";
import type { AdvisorClientProfile } from "../../types/advisors.types";
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
  const navigate = useNavigate();

  // logged-in advisor
  const advisorUserId = getCurrentUserId();

  const [profile, setProfile] = useState<AdvisorClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!advisorUserId || !relationshipId) {
      setLoading(false);
      if (!advisorUserId) {
        setError("Missing advisor user id.");
      } else {
        setError("Missing relationship id.");
      }
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

  if (!relationshipId || !advisorUserId) {
    return (
      <p className="p-4 text-sm text-red-600">
        Missing advisor or relationship id.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card className="p-4">
          <p className="text-sm">Loading client profile...</p>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card className="p-4 bg-red-50 text-red-700">
          <p className="text-sm">{error || "Could not load client profile"}</p>
        </Card>
      </div>
    );
  }

  const ownerUserId = profile.ownerUserId; // candidate id

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

      {/* Candidate overview */}
      {profile.basicProfile && (
        <Card className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">Candidate Overview</h2>
          <div>
            <p className="font-medium">
              {profile.basicProfile.fullName || "Unnamed candidate"}
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
              <span>Industry: {profile.basicProfile.industry}</span>
            )}
            {profile.basicProfile.experienceLevel && (
              <span>Experience: {profile.basicProfile.experienceLevel}</span>
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

      {/* Job summary */}
      {profile.jobSummary && (
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Job Search Summary</h2>
          <p className="text-sm text-gray-600">
            Total tracked opportunities:{" "}
            <strong>{profile.jobSummary.totalJobs}</strong>
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {Object.entries(profile.jobSummary.statusCounts).map(
              ([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-0.5 bg-gray-50 rounded-full"
                >
                  {status}: {count}
                </span>
              )
            )}
          </div>

          {profile.jobSummary.topJobs.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <h3 className="text-sm font-medium">Recent opportunities</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {profile.jobSummary.topJobs.map((job) => (
                  <li key={job.id}>
                    <span className="font-medium">{job.jobTitle}</span>{" "}
                    <span className="text-gray-500">at {job.company}</span>{" "}
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

      {!profile.basicProfile && !profile.jobSummary && (
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            This candidate hasn’t shared any profile or job summary details with
            you yet.
          </p>
        </Card>
      )}

      {/* Advisor views into candidate’s materials, recommendations, sessions */}
      <AdvisorClientMaterialsSection
        relationshipId={relationshipId}
        advisorUserId={advisorUserId}
      />

      <AdvisorClientRecommendationsSection
        relationshipId={relationshipId}
        advisorUserId={advisorUserId}
      />

      {ownerUserId && (
        <AdvisorClientSessionsSection
          relationshipId={relationshipId}
          advisorUserId={advisorUserId}
          ownerUserId={ownerUserId}
        />
      )}
    </div>
  );
}
