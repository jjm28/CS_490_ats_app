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
  type PeerGroup,
  type PeerGroupMembership,
  type GroupPost,
} from "../../../api/peerGroups";

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


  // Privacy modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [g, my, p] = await Promise.all([
          getPeerGroup(groupId),
         listMyPeerGroups(currentUserId),
          fetchGroupPosts(groupId),
        ]);
        setGroup(g);
        setMyMemberships(my.memberships);
        setPosts(p);
      } catch (e) {
        console.error(e);
        setError("Failed to load group discussion.");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

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
            <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
              {post.content}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
