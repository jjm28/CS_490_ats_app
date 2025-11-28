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

export async function listMyPeerGroups() {
  const res = await fetch(`${API_BASE}/my`,  {    headers: authHeaders() ,  });
  if (!res.ok) throw new Error("Failed to fetch my peer groups");
  return (await res.json()) as {
    groups: PeerGroup[];
    memberships: PeerGroupMembership[];
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
  const res = await fetch(`${API_BASE}/${groupId}&userId:${userId}/leave`, {
    method: "POST",
     headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to leave group");
  return await res.json();
}
