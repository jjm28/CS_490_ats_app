// src/api/peerGroups.ts
const API_BASE  =  "http://localhost:5050/api/peer-groups";
const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};
export interface PeerGroup {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  role?: string;
  tags?: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; 
  
}

export interface PeerGroupMembership {
  _id: string;
  userId: string;
  groupId: string;
  role: "member" | "owner" | "moderator";
  showRealNameInGroup: boolean;
  receiveOpportunityAlerts: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
    interactionLevel?: "public" | "alias" | "anonymous";
  alias?: string;
  allowDirectMessages?: boolean;
  showProfileLink?: boolean;
}

export interface UserProfileForGroups {
  targetRole: string | null;
  targetIndustry: string | null;
}

export async function listPeerGroups(params?: {
  industry?: string;
  role?: string;
}) {

  const qs = params ? new URLSearchParams(params as any).toString() : "";
  const res = await  fetch(`${API_BASE}${qs ? `?${qs}` : ""}`,{    headers: authHeaders() ,  });

  if (!res.ok) throw new Error("Failed to fetch peer groups");
  return (await res.json()) as PeerGroup[];
}

export async function listMyPeerGroups(userId: string) {
  const res = await fetch(`${API_BASE}/my?userId=${userId}`,  {    headers: authHeaders() ,  });
  if (!res.ok) throw new Error("Failed to fetch my peer groups");
  return (await res.json()) as {
    groups: PeerGroup[];
    memberships: PeerGroupMembership[];
    userProfile?: UserProfileForGroups;

  };
}

export async function joinPeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_BASE}/join?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
     headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to join group");
  return await res.json();
}

export async function leavePeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_BASE}/leave?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
     headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to leave group");
  return await res.json();
}

export async function createPeerGroup(payload: {
    userId: string;
  name: string;
  description?: string;
  industry?: string | null;
  role?: string | null;
  tags?: string[];
}) {
  const res = await fetch(`${API_BASE}/`, {
    method: "POST",
     headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create group");
  return await res.json(); // { group, membership }
}

export async function updatePeerGroup(
  groupId: string,
  userId: string,
  payload: {
    name?: string;
    description?: string;
    industry?: string | null;
    role?: string | null;
    tags?: string[];
  }
) {
  const res = await fetch(`${API_BASE}?groupId=${groupId}&userId=${userId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update group");
  return (await res.json()) as PeerGroup;
}

export async function deletePeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_BASE}?groupId=${groupId}&userId=${userId}`, {
    method: "DELETE",
     headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete group");
  return await res.json(); // { ok: true }
}


export async function updateMembershipPrivacy(
  groupId: string,
  userId: string,
  payload: {
    interactionLevel?: "public" | "alias" | "anonymous";
    alias?: string;
    allowDirectMessages?: boolean;
    showProfileLink?: boolean;
    showRealNameInGroup?: boolean;
  }
) {
  const res = await fetch(
    `${API_BASE}/membership/privacy?groupId=${groupId}&userId=${userId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) throw new Error("Failed to update membership privacy");
  return (await res.json()) as PeerGroupMembership;
}
