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
  updateMembershipPrivacy,
} from "../../../api/peerGroups";
import GroupPrivacyModal, {
  type GroupPrivacyFormValues,
} from "./GroupPrivacyModal";
import { useNavigate } from "react-router-dom";

export default function PeerGroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<PeerGroup[]>([]);
  const [myMemberships, setMyMemberships] = useState<PeerGroupMembership[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileForGroups | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state (create/edit group)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PeerGroup | null>(null);

  // Privacy modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacyGroup, setPrivacyGroup] = useState<PeerGroup | null>(null);
  const [privacyMembership, setPrivacyMembership] =
    useState<PeerGroupMembership | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Current user id (assumes you're logged in for this page)
  const currentUserId =
    JSON.parse(localStorage.getItem("authUser") ?? "").user._id;

  // Map groupId -> membership
  const membershipByGroupId = useMemo(() => {
    const map: Record<string, PeerGroupMembership> = {};
    myMemberships.forEach((m) => {
      map[m.groupId] = m;
    });
    return map;
  }, [myMemberships]);

  const isMember = (groupId: string) => !!membershipByGroupId[groupId];

  const isOwner = (group: PeerGroup) =>
    !!currentUserId &&
    !!group.createdBy &&
    group.createdBy === (currentUserId as string);

  const openPrivacyModal = (group: PeerGroup) => {
    const membership = membershipByGroupId[group._id];
    if (!membership) return;
    setPrivacyGroup(group);
    setPrivacyMembership(membership);
    setIsPrivacyModalOpen(true);
  };

  const handleSubmitPrivacy = async (values: GroupPrivacyFormValues) => {
    if (!privacyGroup || !privacyMembership) return;

    const updated = await updateMembershipPrivacy(
      privacyGroup._id,
      currentUserId,
      {
        interactionLevel: values.interactionLevel,
        alias: values.alias,
        allowDirectMessages: values.allowDirectMessages,
        showProfileLink: values.showProfileLink,
        showRealNameInGroup: values.showRealNameInGroup,
      }
    );

    // Update local membership cache
    setMyMemberships((prev) =>
      prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
    );
  };

  // Load groups + "my groups" + user profile
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
  }, [currentUserId]);

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

  const myGroups = useMemo(
    () => groups.filter((g) => isMember(g._id)),
    [groups, membershipByGroupId]
  );

  // Recommended groups (simple scoring by targetRole / targetIndustry)
  const recommendedGroups = useMemo(() => {
    if (groups.length === 0) return [];
    const notJoined = groups.filter((g) => !isMember(g._id));

    if (
      !userProfile ||
      (!userProfile.targetRole && !userProfile.targetIndustry)
    ) {
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
        else if (
          g.role &&
          g.role.toLowerCase().includes(targetRole.toLowerCase())
        ) {
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
      // Industry filter
      if (selectedIndustry !== "all" && g.industry !== selectedIndustry)
        return false;
      // Role filter
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
        await leavePeerGroup(group._id, currentUserId);
        setMyMemberships((prev) => prev.filter((m) => m.groupId !== group._id));
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id
              ? { ...g, memberCount: Math.max(0, (g.memberCount || 1) - 1) }
              : g
          )
        );
      } else {
        const { membership } = await joinPeerGroup(group._id, currentUserId);
        setMyMemberships((prev) => [...prev, membership]);
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id
              ? { ...g, memberCount: (g.memberCount || 0) + 1 }
              : g
          )
        );
      }
    } catch (e) {
      console.error(e);
      setError(
        currentlyMember ? "Unable to leave group." : "Unable to join group."
      );
    } finally {
      setJoiningId(null);
    }
  };

  // Create vs edit submit handler (used by modal)
  const handleSubmitGroupForm = async (values: PeerGroupFormValues) => {
    const tagsArray = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingGroup) {
      const updated = await updatePeerGroup(
        editingGroup._id,
        currentUserId,
        {
          name: values.name.trim(),
          description: values.description.trim(),
          industry: values.industry.trim() || null,
          role: values.role.trim() || null,
          tags: tagsArray,
        }
      );

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
      await deletePeerGroup(group._id, currentUserId);
      setGroups((prev) => prev.filter((g) => g._id !== group._id));
      setMyMemberships((prev) => prev.filter((m) => m.groupId !== group._id));
    } catch (e) {
      console.error(e);
      setError("Failed to delete group.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse text-sm text-gray-500">
          Loading peer support groups...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">
      {/* Privacy modal */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Peer Support Groups
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Find peers searching in similar industries or roles, share
            experiences, and keep each other accountable.
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
      </div>

      {/* Top stats + filters */}
      <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        {/* Stats card */}
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
              Your group overview
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Groups joined
              </div>
              <div className="mt-1 text-lg font-semibold">
                {myGroups.length}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Total groups
              </div>
              <div className="mt-1 text-lg font-semibold">
                {groups.length}
              </div>
            </div>
          </div>
          {userProfile && (userProfile.targetRole || userProfile.targetIndustry) && (
            <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900 border border-emerald-100">
              <div className="font-medium text-xs uppercase tracking-wide">
                Your target focus
              </div>
              <div className="mt-1">
                {userProfile.targetRole && (
                  <span className="mr-2">
                    🎯 <span className="font-medium">Role:</span>{" "}
                    {userProfile.targetRole}
                  </span>
                )}
                {userProfile.targetIndustry && (
                  <span>
                    🏢 <span className="font-medium">Industry:</span>{" "}
                    {userProfile.targetIndustry}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Filter card */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-800">
              Discover groups
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by name, description, or tags..."
              className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[160px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="border rounded px-2 py-1.5 text-sm"
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
              className="border rounded px-2 py-1.5 text-sm"
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
        </Card>
      </div>

      {error && (
        <div className="text-sm text-red-600 border border-red-100 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Main content layout: left column (recommended + my groups), right column (all groups) */}
      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-4">
          {/* Recommended groups */}
          {recommendedGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Recommended for you
                </h2>
                <span className="text-[11px] text-gray-500">
                  Based on your profile & target goals
                </span>
              </div>
              <div className="space-y-2">
                {recommendedGroups.map((group) => {
                  const member = isMember(group._id);
                  return (
                    <Card
                      key={group._id}
                      className="flex justify-between items-start p-3 gap-3 border border-emerald-100 bg-emerald-50/40"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm">
                            {group.name}
                          </div>
                          <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                            Recommended
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-600">
                          {group.industry && <span>{group.industry}</span>}
                          {group.industry && group.role && <span> · </span>}
                          {group.role && <span>{group.role}</span>}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          👥 {group.memberCount ?? 0} members
                        </div>
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
                            variant="secondary"
                            onClick={() =>
                              navigate(`/peer-groups/${group._id}`)
                            }
                          >
                            View group
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* My groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Your groups
              </h2>
              <span className="text-[11px] text-gray-500">
                {myGroups.length === 0
                  ? "You haven’t joined any groups yet."
                  : `${myGroups.length} joined`}
              </span>
            </div>
            {myGroups.length === 0 ? (
              <Card className="p-3 text-xs text-gray-500 bg-gray-50">
                Join a group from the list to start sharing updates and staying
                accountable with peers.
              </Card>
            ) : (
              <div className="space-y-2">
                {myGroups.slice(0, 4).map((group) => (
                  <Card
                    key={group._id}
                    className="flex justify-between items-start p-3 gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">
                          {group.name}
                        </div>
                        {isOwner(group) && (
                          <span className="text-[10px] uppercase tracking-wide bg-gray-100 border rounded px-1.5 py-0.5 text-gray-600">
                            You are owner
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-gray-500">
                        👥 {group.memberCount ?? 0} members
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(`/peer-groups/${group._id}`)}
                      >
                        Open
                      </Button>
                    </div>
                  </Card>
                ))}
                {myGroups.length > 4 && (
                  <div className="text-[11px] text-gray-500">
                    + {myGroups.length - 4} more in “All groups”
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* All groups (filtered) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              All peer support groups
            </h2>
            <span className="text-[11px] text-gray-500">
              Showing {filteredGroups.length} result
              {filteredGroups.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
            {filteredGroups.map((group) => {
              const member = isMember(group._id);
              const owner = isOwner(group);

              return (
                <Card
                  key={group._id}
                  className="flex flex-col justify-between p-4 gap-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{group.name}</h3>
                      {owner && (
                        <span className="text-[10px] uppercase tracking-wide bg-gray-100 border rounded px-1.5 py-0.5 text-gray-600">
                          You are owner
                        </span>
                      )}
                      {member && !owner && (
                        <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">
                          Joined
                        </span>
                      )}
                    </div>

                    {group.description && (
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {group.description}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      {group.industry && (
                        <span className="inline-flex items-center gap-1">
                          🏢 {group.industry}
                        </span>
                      )}
                      {group.role && (
                        <span className="inline-flex items-center gap-1">
                          🎯 {group.role}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        👥 {group.memberCount ?? 0} members
                      </span>
                    </div>

                    {group.tags && group.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                          >
                            #{tag}
                          </span>
                        ))}
                        {group.tags.length > 4 && (
                          <span className="text-[11px] text-gray-400">
                            +{group.tags.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button
                      onClick={() => handleJoinLeave(group)}
                      disabled={joiningId === group._id}
                    >
                      {member ? "Leave" : "Join"}
                    </Button>

                    {member && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openPrivacyModal(group)}
                      >
                        Privacy
                      </Button>
                    )}

                    {member && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(`/peer-groups/${group._id}`)}
                      >
                        View
                      </Button>
                    )}

                    {owner && (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingGroup(group);
                            setIsModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredGroups.length === 0 && (
            <Card className="p-4 text-sm text-gray-500 bg-gray-50">
              No groups match your filters. Try clearing search or changing the
              industry/role filters.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
