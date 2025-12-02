import React from "react";
import { useParams } from "react-router-dom";
import { useEffect ,useState} from "react";
import Card from "../StyledComponents/Card";
import JobSearchProgressPanel from "./JobSearchProgressPanel";
import JobSearchEncouragementFeed from "./JobSearchEncouragementFeed";
import JobSearchMotivationPanel from "./JobSearchMotivationPanel";
import JobSearchDiscussionPanel from "./JobSearchDiscussionPanel";
import { fetchSharingProfilepat } from "../../api/jobSearchSharing";
// TODO: replace this with your real auth hook / context
function getCurrentUserIdFromStorage(): string | null {
  try {
    const stored = window.localStorage.getItem("user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?._id || null;
  } catch {
    return null;
  }
}

export default function JobSearchSharingPartnerPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";
  const [isnotallowed, setisnotallowed] = useState(true);
   
  if (!ownerId) {
    return (
      <div className="max-w-2xl mx-auto mt-6 px-4">
        <Card className="p-4">
          <p className="text-sm text-red-600">
            Missing ownerId in route. Please check the link.
          </p>
        </Card>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto mt-6 px-4">
        <Card className="p-4">
          <p className="text-sm">
            You must be logged in to view this shared job search dashboard.
          </p>
        </Card>
      </div>
    );
  }

  const ownerUserId = ownerId;
useEffect(() => {
  async function load() {
    try {
       const [g] = await Promise.all([
       fetchSharingProfilepat(ownerUserId)
         
      ]);
     if (g.allowedUserIds.includes(currentUserId)){
      setisnotallowed(false)
     }
     else{setisnotallowed(true)}
    } catch (err: any) {
      console.error(err);
      setisnotallowed(true)
    } 
  }
  load();
}, [ownerUserId]);

  if (isnotallowed == true) {
    return (
      <div className="max-w-2xl mx-auto mt-6 px-4">
        <Card className="p-4">
          <p className="text-sm">
            You are not allowed to view this shared job search dashboard.
          </p>
        </Card>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto mt-6 px-4 space-y-4">
      <Card className="p-4">
        <h1 className="text-xl font-semibold">Shared Job Search Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          You&apos;re viewing {ownerUserId}&apos;s job search progress. You can
          review their goals, see recent wins, and leave encouragement or
          check-ins.
        </p>
      </Card>

      {/* Goals & milestones – read-only for partner */}
      <JobSearchProgressPanel
        ownerUserId={ownerUserId}
        currentUserId={currentUserId}
        mode="partner"
      />

      {/* Wins / encouragement history – uses owner as the user id */}
      <JobSearchEncouragementFeed currentUserId={ownerUserId} />

      {/* Motivation & activity – backend uses owner + viewer */}
      <JobSearchMotivationPanel
        ownerUserId={ownerUserId}
        viewerUserId={currentUserId}
      />

      {/* Discussion between owner + partners */}
      <JobSearchDiscussionPanel
        ownerUserId={ownerUserId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
