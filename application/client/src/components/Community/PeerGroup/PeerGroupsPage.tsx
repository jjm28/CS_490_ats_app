import React, { useEffect, useMemo, useState } from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import PeerGroupFormModal, {
  type PeerGroupFormValues,
} from "./PeerGroupFormModal";
import {
  listPeerGroups,
  listMyPeerGroups,
  joinPeerGroup,
  leavePeerGroup,
  createPeerGroup,
  updatePeerGroup,
  deletePeerGroup,
  type PeerGroup,
  type PeerGroupMembership,
  type UserProfileForGroups,
} from "../../../api/peerGroups";
import GroupPrivacyModal, {
  type GroupPrivacyFormValues,
} from "./GroupPrivacyModal";
import { updateMembershipPrivacy } from "../../../api/peerGroups";

export default function PeerGroupsPage() {
  const [groups, setGroups] = useState<PeerGroup[]>([]);
  const [myMemberships, setMyMemberships] = useState<PeerGroupMembership[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileForGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PeerGroup | null>(null);


  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
const [privacyGroup, setPrivacyGroup] = useState<PeerGroup | null>(null);
const [privacyMembership, setPrivacyMembership] =
  useState<PeerGroupMembership | null>(null);

  const openPrivacyModal = (group: PeerGroup) => {
  const membership = membershipByGroupId[group._id];
  if (!membership) return;
  setPrivacyGroup(group);
  setPrivacyMembership(membership);
  setIsPrivacyModalOpen(true);
};
const handleSubmitPrivacy = async (values: GroupPrivacyFormValues) => {
  if (!privacyGroup || !privacyMembership) return;

  const updated = await updateMembershipPrivacy(privacyGroup._id,currentUserId, {
    interactionLevel: values.interactionLevel,
    alias: values.alias,
    allowDirectMessages: values.allowDirectMessages,
    showProfileLink: values.showProfileLink,
    showRealNameInGroup: values.showRealNameInGroup,
  });

  // update local membership cache
  setMyMemberships((prev) =>
    prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
  );
};

  const membershipByGroupId = useMemo(() => {
    const map: Record<string, PeerGroupMembership> = {};
    myMemberships.forEach((m) => {
      map[m.groupId] = m;
    });
    return map;
  }, [myMemberships]);

  const isMember = (groupId: string) => !!membershipByGroupId[groupId];
  const isOwner = (group: PeerGroup) =>
    !!currentUserId && !!group.createdBy && group.createdBy === currentUserId;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [allGroups, my] = await Promise.all([
          listPeerGroups(),
          listMyPeerGroups(currentUserId),
        ]);
        setGroups(allGroups);
        setMyMemberships(my.memberships);
        setUserProfile(my.userProfile || null);
      } catch (e) {
        console.error(e);
        setError("Failed to load peer support groups.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Dropdown options
  const industryOptions = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.industry) set.add(g.industry);
    });
    return Array.from(set).sort();
  }, [groups]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.role) set.add(g.role);
    });
    return Array.from(set).sort();
  }, [groups]);

  // Recommended groups (simple scoring by targetRole/targetIndustry)
  const recommendedGroups = useMemo(() => {
    if (groups.length === 0) return [];
    const notJoined = groups.filter((g) => !isMember(g._id));

    if (!userProfile || (!userProfile.targetRole && !userProfile.targetIndustry)) {
      return [...notJoined]
        .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
        .slice(0, 3);
    }

    const { targetRole, targetIndustry } = userProfile;

    const scored = notJoined.map((g) => {
      let score = 0;
      if (targetIndustry && g.industry === targetIndustry) score += 2;
      if (targetRole) {
        if (g.role === targetRole) score += 2;
        else if (g.role && g.role.toLowerCase().includes(targetRole.toLowerCase())) {
          score += 1;
        }
      }
      return { group: g, score };
    });

    return scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.group.memberCount || 0) - (a.group.memberCount || 0);
      })
      .filter((x) => x.score > 0)
      .slice(0, 3)
      .map((x) => x.group);
  }, [groups, userProfile, membershipByGroupId]);

  // Apply search + dropdown filters
  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return groups.filter((g) => {
      if (selectedIndustry !== "all" && g.industry !== selectedIndustry) return false;
      if (selectedRole !== "all" && g.role !== selectedRole) return false;

      if (!term) return true;
      const haystack =
        (g.name || "") +
        " " +
        (g.description || "") +
        " " +
        (g.tags || []).join(" ");
      return haystack.toLowerCase().includes(term);
    });
  }, [groups, searchTerm, selectedIndustry, selectedRole]);

  const handleJoinLeave = async (group: PeerGroup) => {
    const currentlyMember = isMember(group._id);
    setJoiningId(group._id);
    setError(null);

    try {
      if (currentlyMember) {
        await leavePeerGroup(group._id,currentUserId);
        setMyMemberships((prev) => prev.filter((m) => m.groupId !== group._id));
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id
              ? { ...g, memberCount: Math.max(0, g.memberCount - 1) }
              : g
          )
        );
      } else {
        const { membership } = await joinPeerGroup(group._id,currentUserId);
        setMyMemberships((prev) => [...prev, membership]);
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id ? { ...g, memberCount: g.memberCount + 1 } : g
          )
        );
      }
    } catch (e) {
      console.error(e);
      setError(currentlyMember ? "Unable to leave group." : "Unable to join group.");
    } finally {
      setJoiningId(null);
    }
  };

  // Create vs edit submit handler (used by modal)
  const handleSubmitGroupForm = async (values: PeerGroupFormValues) => {
    console.log("wokring")
    const tagsArray = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingGroup) {
      const updated = await updatePeerGroup(editingGroup._id,currentUserId, {
        name: values.name.trim(),
        description: values.description.trim(),
        industry: values.industry.trim() || null,
        role: values.role.trim() || null,
        tags: tagsArray,
      });

      setGroups((prev) =>
        prev.map((g) => (g._id === updated._id ? { ...g, ...updated } : g))
      );
    } else {
      const { group, membership } = await createPeerGroup({
        userId: currentUserId,
        name: values.name.trim(),
        description: values.description.trim(),
        industry: values.industry.trim() || undefined,
        role: values.role.trim() || undefined,
        tags: tagsArray,
      });

      setGroups((prev) => [group, ...prev]);
      setMyMemberships((prev) => [...prev, membership]);
    }
  };

  const handleDeleteGroup = async (group: PeerGroup) => {
    const ok = window.confirm(
      `Delete "${group.name}"? This will remove the group and all memberships.`
    );
    if (!ok) return;

    try {
      await deletePeerGroup(group._id,currentUserId);
      setGroups((prev) => prev.filter((g) => g._id !== group._id));
      setMyMemberships((prev) => prev.filter((m) => m.groupId !== group._id));
    } catch (e) {
      console.error(e);
      setError("Failed to delete group.");
    }
  };

  if (loading) {
    return <div className="p-4">Loading peer support groups...</div>;
  }

  return (
    
    <div className="p-4 space-y-4">
        <GroupPrivacyModal
  open={isPrivacyModalOpen}
  onClose={() => {
    setIsPrivacyModalOpen(false);
    setPrivacyGroup(null);
    setPrivacyMembership(null);
  }}
  group={privacyGroup}
  membership={privacyMembership}
  onSubmit={handleSubmitPrivacy}
/>

      {/* Create/Edit Modal */}
      <PeerGroupFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGroup(null);
        }}
        initialGroup={editingGroup}
        onSubmit={handleSubmitGroupForm}
      />

      {/* Header + create button */}
        <div>
          <h1 className="text-2xl font-semibold">Peer Support Groups</h1>
          <p className="text-sm text-gray-600">
            Join industry or role-specific job search groups to share experiences and
            support each other.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGroup(null);
            setIsModalOpen(true);
          }}
        >
          + Create group
        </Button>
    

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search groups..."
          className="border rounded px-3 py-1 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
        >
          <option value="all">All industries</option>
          {industryOptions.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="all">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Recommended groups */}
      {recommendedGroups.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Recommended for you</h2>
          <div className="space-y-2">
            {recommendedGroups.map((group) => (
              <Card key={group._id} className="flex justify-between items-center p-3">
                <div>
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-gray-500">
                    {group.industry && <span>{group.industry} · </span>}
                    {group.role && <span>{group.role} · </span>}
                    {group.memberCount} members
                  </div>
                </div>
                <Button
                  onClick={() => handleJoinLeave(group)}
                  disabled={joiningId === group._id}
                >
                  Join
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All groups (filtered) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">All peer support groups</h2>
        {filteredGroups.map((group) => {
          const member = isMember(group._id);
          const owner = isOwner(group);

          return (
            <Card
              key={group._id}
              className="flex justify-between items-center p-4 gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{group.name}</h3>
                  {owner && (
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 border rounded px-1.5 py-0.5 text-gray-600">
                      You are owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {group.industry && <span>{group.industry} · </span>}
                  {group.role && <span>{group.role} · </span>}
                  {group.memberCount} members
                </p>
                {group.description && (
                  <p className="text-sm mt-1 text-gray-700">{group.description}</p>
                )}
              </div>

<div className="flex flex-col items-end gap-2">
  <Button
    onClick={() => handleJoinLeave(group)}
    disabled={joiningId === group._id}
  >
    {member ? "Leave" : "Join"}
  </Button>

  {member && (
    <Button
      type="button"
      onClick={() => openPrivacyModal(group)}
    >
      Privacy
    </Button>
  )}

  {owner && (
    <div className="flex gap-1">
      {/* Edit / Delete buttons here */}
    </div>
  )}
</div>

            </Card>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="text-sm text-gray-500">
            No groups match your filters. Try clearing search or dropdowns.
          </div>
        )}
      </div>
    </div>
  );
}
