import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../StyledComponents/Card";
import JobSearchProgressPanel from "./JobSearchProgressPanel";
import JobSearchEncouragementFeed from "./JobSearchEncouragementFeed";
import JobSearchMotivationPanel from "./JobSearchMotivationPanel";
import JobSearchDiscussionPanel from "./JobSearchDiscussionPanel";
import { fetchSharingProfilepat } from "../../api/jobSearchSharing";

// Safer helper to read current user
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

export default function JobSearchSharingPartnerPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
    const currentUserId =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: missing ownerId
  if (!ownerId) {
    return (
      <div className="max-w-2xl mx-auto mt-8 px-4">
        <Card className="p-4">
          <p className="text-sm text-red-600 font-medium">
            The shared link is missing an owner ID. Please ask the sender to resend the invite.
          </p>
        </Card>
      </div>
    );
  }

  // Guard: not logged in
  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto mt-8 px-4">
        <Card className="p-4 space-y-2">
          <h1 className="text-base font-semibold">Log in to view this dashboard</h1>
          <p className="text-sm text-gray-600">
            You need an account to view this shared job search dashboard. Please sign in and try the link again.
          </p>
        </Card>
      </div>
    );
  }

  const ownerUserId = ownerId;

  // Check access against sharing profile
  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      try {
        setError(null);
        setAccessChecked(false);
        const sharingProfile = await fetchSharingProfilepat(ownerUserId);

        const allowed = Array.isArray(sharingProfile?.allowedUserIds)
          ? sharingProfile.allowedUserIds.includes(currentUserId)
          : false;

        if (!isMounted) return;
        setIsAllowed(allowed);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError("We couldn’t verify your access to this shared dashboard.");
        setIsAllowed(false);
      } finally {
        if (isMounted) setAccessChecked(true);
      }
    }

    loadAccess();
    return () => {
      isMounted = false;
    };
  }, [ownerUserId, currentUserId]);

  // Loading state while we check permissions
  if (!accessChecked) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4">
        <Card className="p-5 flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
          <div className="text-sm text-gray-600">
            Checking your access to this shared job search dashboard...
          </div>
        </Card>
      </div>
    );
  }

  // Not allowed
  if (!isAllowed) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4">
        <Card className="p-5 space-y-2">
          <h1 className="text-base font-semibold flex items-center gap-2">
            <span>🔒</span>
            <span>Access to this dashboard is restricted</span>
          </h1>
          <p className="text-sm text-gray-600">
            You don’t currently have permission to view this job search dashboard.
            If you believe this is a mistake, ask the owner to re-share it with your account.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1">
              Technical note: {error}
            </p>
          )}
        </Card>
      </div>
    );
  }

  // Main layout when allowed
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header / hero card */}
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Shared Job Search Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            You’re viewing a job seeker’s progress and support space. Review their
            goals, celebrate wins, and leave encouragement or check-ins to help
            them stay motivated.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-3 text-sm">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
            JS
          </div>
          <div className="text-xs text-gray-500">
            <div className="font-medium text-gray-700">Partner view</div>
            <div>Some actions may be read-only.</div>
          </div>
        </div>

      {/* Two-column dashboard layout */}
      <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        {/* Left column: progress + motivation */}
        <div className="space-y-4">
          {/* Goals & milestones – read-only for partner */}
          <JobSearchProgressPanel
            ownerUserId={ownerUserId}
            currentUserId={currentUserId}
            mode="partner"
          />

          {/* Motivation & activity – backend uses owner + viewer */}
          <JobSearchMotivationPanel
            ownerUserId={ownerUserId}
            viewerUserId={currentUserId}
          />
        </div>

        {/* Right column: encouragement + discussion */}
        <div className="space-y-4">
          {/* Wins / encouragement history – uses owner as the user id */}
          <JobSearchEncouragementFeed currentUserId={ownerUserId} />

          {/* Discussion between owner + partners */}
          <JobSearchDiscussionPanel
            ownerUserId={ownerUserId}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
