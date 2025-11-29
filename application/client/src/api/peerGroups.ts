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


export interface PostPersona {
  mode: "public" | "alias" | "anonymous";
  displayName: string;
  headline?: string;
  canViewProfile?: boolean;
}

export interface GroupPost {
  _id: string;
  groupId: string;
  content: string;
  type: "insight" | "question" | "strategy" | "other";
  createdAt: string;
  updatedAt: string;
  persona: PostPersona;
}


export async function fetchGroupPosts(groupId: string, limit = 30) {
  const res = await fetch(
    `${API_BASE}/posts?limit=${limit}&groupId=${groupId}`,
    {
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch group posts");
  const data = (await res.json()) as { posts: GroupPost[] };
  return data.posts;
}

export async function createGroupPost(
  groupId: string,
  userId: string,
  payload: { content: string; type?: "insight" | "question" | "strategy" | "other" }
) {
  const res = await fetch(`${API_BASE}/posts?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
     headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create group post");
  return (await res.json()) as GroupPost;
}


export async function getPeerGroup(groupId: string) {
  const res = await fetch(`${API_BASE}/single?groupId=${groupId}`, {
     headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch peer group");
  return (await res.json()) as PeerGroup;
}

export interface GroupChallenge {
  _id: string;
  groupId: string;
  createdBy: string;
  title: string;
  description?: string;
  type: "applications" | "outreach" | "practice" | "other";
  targetValue: number;
  unitLabel: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupChallengeStats {
  participantCount: number;
  totalProgress: number;
}

export interface GroupChallengeParticipation {
  _id: string;
  challengeId: string;
  userId: string;
  progressValue: number;
  joinedAt: string;
  lastUpdateAt: string;
  lastNote?: string;
  createdAt: string;
  updatedAt: string;
}


export async function fetchGroupChallenges(groupId: string, userId: string) {
  
  const res = await fetch(`${API_BASE}/challenges?groupId=${groupId}&userId=${userId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch group challenges");
  const data = (await res.json()) as {
    challenges: GroupChallenge[];
    myParticipations: GroupChallengeParticipation[];
    stats: Record<string, GroupChallengeStats>;
  };
  return data;
}

export async function createGroupChallenge(
  groupId: string,
  userId: string,
  payload: {
    title: string;
    description?: string;
    type: "applications" | "outreach" | "practice" | "other";
    targetValue: number;
    unitLabel: string;
    startDate: string; // ISO date
    endDate: string;   // ISO date
  }
) {

  const res = await fetch(`${API_BASE}/challenges?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
    credentials: "include",
     headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create challenge");
  return (await res.json()) as GroupChallenge;
}

export async function joinGroupChallenge(challengeId: string, userId: string) {
  const res = await fetch(
    `${API_BASE}/challenges/join?challengeId=${challengeId}&userId=${userId}`,
    {
      method: "POST",
       headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to join challenge");
  return (await res.json()) as GroupChallengeParticipation;
}

export async function updateGroupChallengeProgress(
  challengeId: string,
  userId: string,
  payload: { delta: number; note?: string }
) {
  const res = await fetch(
    `${API_BASE}/challenges/progress?challengeId=${challengeId}&userId=${userId}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to update challenge progress");
  return (await res.json()) as GroupChallengeParticipation;
}

export async function leaveGroupChallenge(challengeId: string, userId: string) {
  const res = await fetch(
    `${API_BASE}/challenges/participation?challengeId=${challengeId}&userId=${userId}`,
    {
      method: "DELETE",
        headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to leave challenge");
  return await res.json(); // { ok: true }
}


export interface ChallengeLeaderboardEntry {
  userId: string;
  progressValue: number;
  persona: {
    mode: "public" | "alias" | "anonymous";
    displayName: string;
    headline?: string;
  };
}

export async function fetchChallengeLeaderboard(challengeId: string,userId: string) {
  const res = await fetch(
    `${API_BASE}/challenges/leaderboard?challengeId=${challengeId}&userId=${userId}`,
    {
         headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch challenge leaderboard");

  const data = (await res.json()) as { entries: ChallengeLeaderboardEntry[] };
    console.log(data)
  return data.entries;
}
