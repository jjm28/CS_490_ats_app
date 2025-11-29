import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import GroupPrivacyModal, {
  type GroupPrivacyFormValues,
} from "./GroupPrivacyModal";
import {
  getPeerGroup,
  listMyPeerGroups,
  fetchGroupPosts,
  createGroupPost,
  updateMembershipPrivacy,
  fetchGroupChallenges,
  createGroupChallenge,
  joinGroupChallenge,
  updateGroupChallengeProgress,
  leaveGroupChallenge,
   updatePostHighlight, 
  type PeerGroup,
  type PeerGroupMembership,
  type GroupPost,
  type GroupChallenge,
  type GroupChallengeParticipation,
  type GroupChallengeStats,
  type  ChallengeLeaderboardEntry
} from "../../../api/peerGroups";
import ChallengeCard from "./ChallengeCard";

export default function PeerGroupDiscussionPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<PeerGroup | null>(null);
  const [myMemberships, setMyMemberships] = useState<PeerGroupMembership[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"insight" | "question" | "strategy">(
    "insight"
  );
    const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id
const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
const [myChallengeParticipations, setMyChallengeParticipations] = useState<
  GroupChallengeParticipation[]
>([]);
const [challengeStats, setChallengeStats] = useState<
  Record<string, GroupChallengeStats>
>({});
const [challengesLoading, setChallengesLoading] = useState(true);
const [challengeError, setChallengeError] = useState<string | null>(null);
const [creatingChallenge, setCreatingChallenge] = useState(false);
const [newChallengeTitle, setNewChallengeTitle] = useState("");
const [newChallengeType, setNewChallengeType] = useState<
  "applications" | "outreach" | "practice" | "other"
>("applications");
const [newChallengeTarget, setNewChallengeTarget] = useState<string>("10");
const [newChallengeUnit, setNewChallengeUnit] = useState("applications");
const [newChallengeStart, setNewChallengeStart] = useState<string>("");
const [newChallengeEnd, setNewChallengeEnd] = useState<string>("");
const [newChallengeDescription, setNewChallengeDescription] = useState("");

const successPosts = useMemo(
  () => posts.filter((p) => p.highlightType === "success").slice(0, 3),
  [posts]
);

const learningPosts = useMemo(
  () => posts.filter((p) => p.highlightType === "learning").slice(0, 3),
  [posts]
);


  // Privacy modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const isGroupOwner = useMemo(() => {
    if (!group || !currentUserId) return false;
    return group.createdBy === currentUserId;
  }, [group, currentUserId]);

useEffect(() => {
  if (!groupId) return;
  (async () => {
    try {
      setLoading(true);
      setError(null);
      setChallengesLoading(true);
      setChallengeError(null);

      const [g, my, p, ch] = await Promise.all([
        getPeerGroup(groupId),
        listMyPeerGroups(currentUserId),
        fetchGroupPosts(groupId),
        fetchGroupChallenges(groupId,currentUserId),
      ]);

      setGroup(g);
      setMyMemberships(my.memberships);
      setPosts(p);

      setChallenges(ch.challenges);
      setMyChallengeParticipations(ch.myParticipations);
      setChallengeStats(ch.stats);
    } catch (e) {
      console.error(e);
      setError("Failed to load group discussion.");
      setChallengeError("Failed to load challenges.");
    } finally {
      setLoading(false);
      setChallengesLoading(false);
    }
  })();
}, [groupId]);

const handleCreateChallenge = async () => {
  if (!groupId) return;
  if (!newChallengeTitle.trim()) return;

  const target = Number(newChallengeTarget || 0);
  if (!target || isNaN(target)) {
    setChallengeError("Target must be a valid number.");
    return;
  }
  if (!newChallengeStart || !newChallengeEnd) {
    setChallengeError("Start and end dates are required.");
    return;
  }

  try {
    setCreatingChallenge(true);
    setChallengeError(null);

    await createGroupChallenge(groupId, currentUserId ,{
      title: newChallengeTitle.trim(),
      description: newChallengeDescription.trim(),
      type: newChallengeType,
      targetValue: target,
      unitLabel: newChallengeUnit.trim() || "actions",
      startDate: newChallengeStart,
      endDate: newChallengeEnd,
    });

    // after creating, refresh challenges from backend to get stats etc.
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setMyChallengeParticipations(ch.myParticipations);
    setChallengeStats(ch.stats);

    // reset form
    setNewChallengeTitle("");
    setNewChallengeDescription("");
    setNewChallengeTarget("10");
    setNewChallengeUnit(
      newChallengeType === "applications"
        ? "applications"
        : newChallengeType === "outreach"
        ? "messages"
        : newChallengeType === "practice"
        ? "sessions"
        : "actions"
    );
    setNewChallengeStart("");
    setNewChallengeEnd("");
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to create challenge.");
  } finally {
    setCreatingChallenge(false);
  }
};


  const membership = useMemo(() => {
    if (!groupId) return null;
    return myMemberships.find((m) => m.groupId === groupId) || null;
  }, [myMemberships, groupId]);

  const interactionLabel = useMemo(() => {
    if (!membership) return "You haven't joined this group yet.";
    const mode = membership.interactionLevel || "public";
    if (mode === "anonymous") return "Your posts appear as Anonymous in this group.";
    if (mode === "alias")
      return `Your posts appear under your alias "${membership.alias || "Anonymous"}".`;
    return "Your posts appear with your real name in this group.";
  }, [membership]);

  const handlePost = async () => {
    if (!groupId || !content.trim()) return;
    if (!membership) {
      setError("You must join this group before posting.");
      return;
    }

    try {
      setPosting(true);
      setError(null);
      const newPost = await createGroupPost(groupId, currentUserId, {
        content,
        type: postType,
      });

      // newPost won't have persona from POST; refetch or optimistically insert
      // simplest: refetch posts
      const updatedPosts = await fetchGroupPosts(groupId);
      setPosts(updatedPosts);
      setContent("");
    } catch (e) {
      console.error(e);
      setError("Failed to publish your post.");
    } finally {
      setPosting(false);
    }
  };
const participationByChallengeId = useMemo(() => {
  const map: Record<string, GroupChallengeParticipation> = {};
  myChallengeParticipations.forEach((p) => {
    map[p.challengeId] = p;
  });
  return map;
}, [myChallengeParticipations]);
const handleJoinChallenge = async (challenge: GroupChallenge) => {
  if (!groupId) return;
  if (!membership) {
    setChallengeError("You must join this group before joining challenges.");
    return;
  }
  try {
    const participation = await joinGroupChallenge(challenge._id,currentUserId);
    setMyChallengeParticipations((prev) => {
      const existing = prev.find((p) => p._id === participation._id);
      if (existing) {
        return prev.map((p) => (p._id === participation._id ? participation : p));
      }
      return [...prev, participation];
    });

    // refresh stats
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to join challenge.");
  }
};
const handleHighlightPost = async (
  postId: string,
  highlightType: "success" | "learning" | null
) => {
  if (!groupId) return;

  try {
    await updatePostHighlight(groupId, postId, currentUserId, highlightType);

    // Update local posts array
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, highlightType } : p
      )
    );
  } catch (e) {
    console.error(e);
    setError("Failed to update post highlight.");
  }
};

const handleUpdateChallengeProgress = async (
  challenge: GroupChallenge,
  delta: number,
  note?: string
) => {
  if (!groupId) return;
  if (!membership) {
    setChallengeError("You must join this group before updating progress.");
    return;
  }
  if (!delta || isNaN(delta)) return;

  try {
    const participation = await updateGroupChallengeProgress(challenge._id,currentUserId, {
      delta,
      note,
    });

    setMyChallengeParticipations((prev) =>
      prev.map((p) => (p._id === participation._id ? participation : p))
    );

    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to update challenge progress.");
  }
};
const handleLeaveChallenge = async (challenge: GroupChallenge) => {
  if (!groupId) return;
  if (!membership) return;

  const ok = window.confirm(
    `Leave "${challenge.title}"? Your progress will no longer be tracked.`
  );
  if (!ok) return;

  try {
    await leaveGroupChallenge(challenge._id,currentUserId);

    // ✅ Refresh to drop participantCount and remove myParticipation
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setMyChallengeParticipations(ch.myParticipations);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to leave challenge.");
  }
};

  const handleSubmitPrivacy = async (values: GroupPrivacyFormValues) => {
    if (!groupId || !membership) return;

    const updated = await updateMembershipPrivacy(groupId,currentUserId, {
      interactionLevel: values.interactionLevel,
      alias: values.alias,
      allowDirectMessages: values.allowDirectMessages,
      showProfileLink: values.showProfileLink,
      showRealNameInGroup: values.showRealNameInGroup,
    });

    setMyMemberships((prev) =>
      prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
    );

    // refresh posts so persona updates immediately
    const refreshedPosts = await fetchGroupPosts(groupId);
    setPosts(refreshedPosts);
  };

  if (!groupId) {
    return <div className="p-4">Invalid group.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading group discussion...</div>;
  }

  if (error && !group) {
    return (
      <div className="p-4">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">Group not found.</p>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Privacy modal */}
      <GroupPrivacyModal
        open={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        group={group}
        membership={membership}
        onSubmit={handleSubmitPrivacy}
      />
{(successPosts.length > 0 || learningPosts.length > 0) && (
  <Card className="p-3 space-y-2">
    <h2 className="text-sm font-medium">Success stories & learning</h2>

    {successPosts.length > 0 && (
      <div>
        <div className="text-[11px] font-semibold text-green-700 mb-1">
          Recent success stories
        </div>
        <ul className="space-y-1">
          {successPosts.map((p) => (
            <li key={p._id} className="text-[11px] text-gray-800">
              <span className="font-medium">{p.persona.displayName}:</span>{" "}
              {p.content.length > 120
                ? p.content.slice(0, 117) + "..."
                : p.content}
            </li>
          ))}
        </ul>
      </div>
    )}

    {learningPosts.length > 0 && (
      <div>
        <div className="text-[11px] font-semibold text-blue-700 mb-1 mt-2">
          Learning resources
        </div>
        <ul className="space-y-1">
          {learningPosts.map((p) => (
            <li key={p._id} className="text-[11px] text-gray-800">
              <span className="font-medium">{p.persona.displayName}:</span>{" "}
              {p.content.length > 120
                ? p.content.slice(0, 117) + "..."
                : p.content}
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
)}

      {/* Header */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-xs text-gray-500">
            {group.industry && <span>{group.industry} · </span>}
            {group.role && <span>{group.role} · </span>}
          </p>
          {group.description && (
            <p className="text-sm text-gray-700 mt-1">{group.description}</p>
          )}
        </div>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>

      {/* Interaction level banner */}
      <Card className="p-3 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-700">{interactionLabel}</p>
        {membership && (
          <Button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-xs"
          >
            Privacy settings
          </Button>
        )}
      </Card>

      {/* Composer */}
      <Card className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Share an insight or strategy</span>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={postType}
            onChange={(e) =>
              setPostType(e.target.value as "insight" | "question" | "strategy")
            }
          >
            <option value="insight">Insight</option>
            <option value="strategy">Strategy</option>
            <option value="question">Question</option>
          </select>
        </div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          rows={3}
          placeholder={
            membership
              ? "Share how you're approaching applications, interviews, or networking..."
              : "Join this group to share insights."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!membership || posting}
        />
        <div className="flex justify-end">
          <Button onClick={handlePost} disabled={!membership || posting || !content.trim()}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>
        {!membership && (
          <p className="text-[11px] text-gray-500">
            You need to join this group before you can post.
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </Card>

      {/* Posts list */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Recent posts</h2>
        {posts.length === 0 && (
          <p className="text-xs text-gray-500">
            No posts yet. Be the first to share an insight or strategy!
          </p>
        )}
        {posts.map((post) => (
          <Card key={post._id} className="p-3 space-y-1">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-medium">
                  {post.persona.displayName}
                  {post.persona.mode === "anonymous" && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      (Anonymous)
                    </span>
                  )}
                  {post.persona.mode === "alias" && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      (Alias)
                    </span>
                  )}
                </div>
                {post.persona.headline && (
                  <div className="text-[10px] text-gray-500">
                    {post.persona.headline}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-500">
                {new Date(post.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-xs inline-block rounded-full bg-gray-100 px-2 py-0.5 mt-1">
              {post.type}
            </div>
             {post.highlightType === "success" && (
                <span className="text-[10px] inline-block rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                  Success story
                </span>
              )}
              {post.highlightType === "learning" && (
                <span className="text-[10px] inline-block rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
                  Learning resource
                </span>
              )}
              {(isGroupOwner || post.isMine) && (
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      className="text-[10px] underline text-gray-500"
                      onClick={() => handleHighlightPost(post._id, "success")}
                    >
                      Mark success
                    </button>
                    <button
                      type="button"
                      className="text-[10px] underline text-gray-500"
                      onClick={() => handleHighlightPost(post._id, "learning")}
                    >
                      Mark learning
                    </button>
                    {post.highlightType && (
                      <button
                        type="button"
                        className="text-[10px] underline text-gray-400"
                        onClick={() => handleHighlightPost(post._id, null)}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
            <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
              {post.content}
            </p>
          </Card>
        ))}
      </div>

      {/* Challenges & accountability */}
<div className="space-y-2 mt-6">
  <h2 className="text-lg font-medium">Group challenges & accountability</h2>

  {challengesLoading && (
    <p className="text-xs text-gray-500">Loading challenges...</p>
  )}

  {challengeError && (
    <p className="text-xs text-red-600">{challengeError}</p>
  )}

  {!challengesLoading && challenges.length === 0 && (
    <p className="text-xs text-gray-500">
      No challenges yet. Group owners can create weekly goals like “Apply to 10 jobs”
      or “Send 5 networking messages”.
    </p>
  )}
  {/* Only group owner can create challenges */}
  {isGroupOwner && (
    <div className="border rounded-md p-3 space-y-2 bg-gray-50">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Create a new challenge</span>
      </div>

      <div className="space-y-2 text-xs">
        <input
          className="w-full border rounded px-2 py-1"
          placeholder='Title (e.g. "Apply to 10 jobs this week")'
          value={newChallengeTitle}
          onChange={(e) => setNewChallengeTitle(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-2 py-1"
          rows={2}
          placeholder="Optional description (how to participate, tips, etc.)"
          value={newChallengeDescription}
          onChange={(e) => setNewChallengeDescription(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-2 py-1"
            value={newChallengeType}
            onChange={(e) =>
              setNewChallengeType(
                e.target.value as "applications" | "outreach" | "practice" | "other"
              )
            }
          >
            <option value="applications">Applications</option>
            <option value="outreach">Outreach</option>
            <option value="practice">Interview practice</option>
            <option value="other">Other</option>
          </select>

          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-24"
            placeholder="Goal"
            value={newChallengeTarget}
            onChange={(e) => setNewChallengeTarget(e.target.value)}
          />

          <input
            className="border rounded px-2 py-1 w-32"
            placeholder="Unit"
            value={newChallengeUnit}
            onChange={(e) => setNewChallengeUnit(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col">
            <label className="text-[11px] text-gray-500">Start date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-xs"
              value={newChallengeStart}
              onChange={(e) => setNewChallengeStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] text-gray-500">End date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-xs"
              value={newChallengeEnd}
              onChange={(e) => setNewChallengeEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={creatingChallenge}
            onClick={handleCreateChallenge}
          >
            {creatingChallenge ? "Creating..." : "Create challenge"}
          </Button>
        </div>
      </div>
    </div>
  )}

  <div className="space-y-3">
    {challenges.map((ch) => (
     <ChallengeCard
  key={ch._id}
  challenge={ch}
  stats={challengeStats[ch._id] || { participantCount: 0, totalProgress: 0 }}
  membership={membership}
  myParticipation={participationByChallengeId[ch._id] || null}
  onJoin={handleJoinChallenge}
  onUpdateProgress={handleUpdateChallengeProgress}
  onLeave={handleLeaveChallenge}
/>

      
    ))}
  </div>
</div>

    </div>
  );
}

