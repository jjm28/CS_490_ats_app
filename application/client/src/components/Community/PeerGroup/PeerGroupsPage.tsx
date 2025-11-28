// src/components/PeerGroups/PeerGroupsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import {
  listPeerGroups,
  listMyPeerGroups,
  joinPeerGroup,
  leavePeerGroup,
  type PeerGroup,
  type PeerGroupMembership,
} from "../../../api/peerGroups";

export default function PeerGroupsPage() {
  const [groups, setGroups] = useState<PeerGroup[]>([]);
  const [myMemberships, setMyMemberships] = useState<PeerGroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const membershipByGroupId = useMemo(() => {
    const map: Record<string, PeerGroupMembership> = {};
    myMemberships.forEach((m) => {
      map[m.groupId] = m;
    });
    return map;
  }, [myMemberships]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [allGroups, my] = await Promise.all([
          listPeerGroups(),
          listMyPeerGroups(),
        ]);
        setGroups(allGroups);
        setMyMemberships(my.memberships);
      } catch (e) {
        console.error(e);
        setError("Failed to load peer support groups.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleJoinLeave = async (group: PeerGroup) => {
    const isMember = !!membershipByGroupId[group._id];
    setJoiningId(group._id);
    setError(null);

    try {
        const user = JSON.parse(localStorage.getItem("authUser") ?? "").user
      if (isMember) {
        await leavePeerGroup(group._id,user._id);
        setMyMemberships((prev) => prev.filter((m) => m.groupId !== group._id));
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id
              ? { ...g, memberCount: Math.max(0, g.memberCount - 1) }
              : g
          )
        );
      } else {
     const user = JSON.parse(localStorage.getItem("authUser") ?? "").user

        const { membership } = await joinPeerGroup(group._id,user._id);
        setMyMemberships((prev) => [...prev, membership]);
        setGroups((prev) =>
          prev.map((g) =>
            g._id === group._id ? { ...g, memberCount: g.memberCount + 1 } : g
          )
        );
      }
    } catch (e) {
      console.error(e);
      setError(isMember ? "Unable to leave group." : "Unable to join group.");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading peer support groups...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Peer Support Groups</h1>
      <p className="text-sm text-gray-600">
        Join industry or role-specific job search groups to share experiences and support
        each other during your search.
      </p>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Later we can add dropdowns here for industry/role filters */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isMember = !!membershipByGroupId[group._id];
          return (
            <Card
              key={group._id}
              className="flex justify-between items-center p-4 gap-4"
            >
              <div className="flex-1">
                <h2 className="font-medium">{group.name}</h2>
                <p className="text-xs text-gray-500">
                  {group.industry && <span>{group.industry} · </span>}
                  {group.role && <span>{group.role} · </span>}
                  {group.memberCount} members
                </p>
                {group.description && (
                  <p className="text-sm mt-1 text-gray-700">{group.description}</p>
                )}
              </div>
              <Button
                onClick={() => handleJoinLeave(group)}
                disabled={joiningId === group._id}
              >
                {isMember ? "Leave" : "Join"}
              </Button>
            </Card>
          );
        })}

        {groups.length === 0 && (
          <div className="text-sm text-gray-500">
            No peer groups available yet. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
}
