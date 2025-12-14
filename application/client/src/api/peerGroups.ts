// src/api/peerGroups.ts
import type { Job } from "../types/jobs.types";
import API_BASE from "../utils/apiBase";
const API_URL  =  `${API_BASE}/api/peer-groups`;
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
  const res = await  fetch(`${API_URL}${qs ? `?${qs}` : ""}`,{    headers: authHeaders() ,  });

  if (!res.ok) throw new Error("Failed to fetch peer groups");
  return (await res.json()) as PeerGroup[];
}

export async function listMyPeerGroups(userId: string) {
  const res = await fetch(`${API_URL}/my?userId=${userId}`,  {    headers: authHeaders() ,  });
  if (!res.ok) throw new Error("Failed to fetch my peer groups");
  return (await res.json()) as {
    groups: PeerGroup[];
    memberships: PeerGroupMembership[];
    userProfile?: UserProfileForGroups;

  };
}

export async function joinPeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_URL}/join?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
     headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to join group");
  return await res.json();
}

export async function leavePeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_URL}/leave?groupId=${groupId}&userId=${userId}`, {
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
  const res = await fetch(`${API_URL}/`, {
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
  const res = await fetch(`${API_URL}?groupId=${groupId}&userId=${userId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update group");
  return (await res.json()) as PeerGroup;
}

export async function deletePeerGroup(groupId: string, userId: string) {
  const res = await fetch(`${API_URL}?groupId=${groupId}&userId=${userId}`, {
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
    `${API_URL}/membership/privacy?groupId=${groupId}&userId=${userId}`,
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
    highlightType?: "success" | "learning" | null;
  isMine?: boolean;
}


export async function fetchGroupPosts(groupId: string, limit = 30) {
  const res = await fetch(
    `${API_URL}/posts?limit=${limit}&groupId=${groupId}`,
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
  const res = await fetch(`${API_URL}/posts?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
     headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create group post");
  return (await res.json()) as GroupPost;
}


export async function getPeerGroup(groupId: string) {
  const res = await fetch(`${API_URL}/single?groupId=${groupId}`, {
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
  
  const res = await fetch(`${API_URL}/challenges?groupId=${groupId}&userId=${userId}`, {
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

  const res = await fetch(`${API_URL}/challenges?groupId=${groupId}&userId=${userId}`, {
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
    `${API_URL}/challenges/join?challengeId=${challengeId}&userId=${userId}`,
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
    `${API_URL}/challenges/progress?challengeId=${challengeId}&userId=${userId}`,
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
    `${API_URL}/challenges/participation?challengeId=${challengeId}&userId=${userId}`,
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
    `${API_URL}/challenges/leaderboard?challengeId=${challengeId}&userId=${userId}`,
    {
         headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch challenge leaderboard");

  const data = (await res.json()) as { entries: ChallengeLeaderboardEntry[] };
    console.log(data)
  return data.entries;
}

export async function updatePostHighlight(
  groupId: string,
  postId: string,
  userId: string,
  highlightType: "success" | "learning" | null
) {
  const res = await fetch(
    `${API_URL}/posts/highlight?groupId=${groupId}&userId=${userId}&postId=${postId}`,
    {
      method: "PATCH",
       headers: authHeaders(),
      body: JSON.stringify({ highlightType }),
    }
  );
  if (!res.ok) throw new Error("Failed to update post highlight");
  return (await res.json()) as {
    _id: string;
    groupId: string;
    highlightType: "success" | "learning" | null;
  };
}


export interface PeerOpportunity {
  _id: string;
  groupId: string;
  createdBy: string;
  title: string;
  company: string;
  location?: string;
  jobUrl?: string;
  source?: string;
  referralAvailable: boolean;
  maxReferrals: number;
  tags: string[];
  notes?: string;
  status: "open" | "filled" | "closed" | "expired";
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeerOpportunityStats {
  interestCount: number;
  referredCount: number;
}

export interface PeerOpportunityInterest {
  _id: string;
  opportunityId: string;
  userId: string;
  status: "interested" | "profile_sent" | "referred" | "rejected" | "withdrawn";
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityInterestEntry {
  _id: string;
  userId: string;
  status: string;
  note: string;
  createdAt: string;
  persona: {
    mode: "public" | "alias" | "anonymous";
    displayName: string;
    headline?: string;
  };
}


export async function fetchGroupOpportunities(groupId: string, userId: string) {
  const res = await fetch(`${API_URL}/opportunities?groupId=${groupId}&userId=${userId}`, {
        headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch opportunities");
  const data = (await res.json()) as {
    opportunities: PeerOpportunity[];
    myInterests: PeerOpportunityInterest[];
    stats: Record<string, PeerOpportunityStats>;
  };
  return data;
  
}

export async function createPeerOpportunity(
  groupId: string,
  userId: string,
  payload: {
    title: string;
    company: string;
    location?: string;
    jobUrl?: string;
    source?: string;
    referralAvailable?: boolean;
    maxReferrals?: number;
    tags?: string[];
    notes?: string;
    expiresAt?: string | null;
  }
) {
  const res = await fetch(`${API_URL}/opportunities?groupId=${groupId}&userId=${userId}`, {
    method: "POST",
      headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create opportunity");
  return (await res.json()) as PeerOpportunity;
}

export async function expressInterestInOpportunity(
  opportunityId: string,
  userId: string,
  payload: { note?: string; status?: "interested" | "withdrawn" }
) {
  const res = await fetch(
    `${API_URL}/opportunities/interest?opportunityId=${opportunityId}&userId=${userId}`,
    {
      method: "POST",
  headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to express interest");
  return (await res.json()) as PeerOpportunityInterest;
}

export async function fetchOpportunityInterests(opportunityId: string, userId: string) {
  const res = await fetch(
    `${API_URL}/opportunities/interests?opportunityId=${opportunityId}&userId=${userId}`,
    {
        headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch interested candidates");
  const data = (await res.json()) as { entries: OpportunityInterestEntry[] };
  console.log(data,data.entries)
  return data.entries;
}


// ---- Group events (coaching / webinars) ----

export interface PeerGroupEvent {
  _id: string;
  groupId: string;      // string id
  createdBy: string;    // string userId
  title: string;
  description?: string;
  type: "group_coaching" | "webinar" | "office_hours" | "other";
  startTime: string;    // ISO string from server
  endTime: string;      // ISO string
  locationType: "online" | "in_person";
  locationText?: string;
  joinUrl?: string;
  maxAttendees: number;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface PeerGroupEventStats {
  goingCount: number;
  interestedCount: number;
}

export interface PeerGroupEventRsvp {
  _id: string;
  eventId: string;
  userId: string;
  status: "going" | "interested" | "not_going";
  createdAt: string;
  updatedAt: string;
}


// API base import should already exist in this file
// import API_URL from "../utils/apiBase";

export async function fetchGroupEvents(params: {
  groupId: string;
  userId: string;
}) {
  const { groupId, userId } = params;
  const url = new URL(`${API_URL}/events`);
  url.searchParams.set("groupId", groupId);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    credentials: "include",
  });
    console.log(res)
  if (!res.ok) throw new Error("Failed to fetch group events");

  const data = (await res.json()) as {
    events: PeerGroupEvent[];
    myRsvps: PeerGroupEventRsvp[];
    stats: Record<string, PeerGroupEventStats>;
  };


  return data;
}

export async function createGroupEvent(params: {
  groupId: string;
  userId: string;
  payload: {
    title: string;
    description?: string;
    type?: "group_coaching" | "webinar" | "office_hours" | "other";
    startTime: string; // ISO string
    endTime: string;   // ISO string
    locationType?: "online" | "in_person";
    locationText?: string;
    joinUrl?: string;
    maxAttendees?: number;
  };
}) {
  const { groupId, userId, payload } = params;
  const url = new URL(`${API_URL}/events`);
  url.searchParams.set("groupId", groupId);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create group event");
  return (await res.json()) as PeerGroupEvent;
}

export async function rsvpToGroupEvent(params: {
  eventId: string;
  userId: string;
  status: "going" | "interested" | "not_going";
}) {
  const { eventId, userId, status } = params;
  const url = new URL(`${API_URL}/events/rsvp`);
  url.searchParams.set("eventId", eventId);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to RSVP to event");
  return (await res.json()) as PeerGroupEventRsvp;
}

// ---- Networking impact analytics ----

export interface NetworkingImpactMe {
  jobsFromGroup: number;
  interviewsFromGroup: number;
  offersFromGroup: number;
}

export interface NetworkingImpactGroup {
  jobsFromGroup: number;
  interviewsFromGroup: number;
  offersFromGroup: number;
  membersWithPeerJobs: number;
}

export interface NetworkingImpactResponse {
  me: NetworkingImpactMe;
  group: NetworkingImpactGroup;
}

export async function fetchNetworkingImpact(params: {
  groupId: string;
  userId: string;
}) {
  const { groupId, userId } = params;
  const url = new URL(`${API_URL}/networking-impact`);
  url.searchParams.set("groupId", groupId);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch networking impact");

  return (await res.json()) as NetworkingImpactResponse;
}




export async function createJobFromPeerOpportunity(params: {
  userId: string;
  groupId: string;
  opportunityId: string;
}) {
  const { userId, groupId, opportunityId } = params;

  const url = new URL(`${API_URL}/from-peer-opportunity`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("groupId", groupId);
  url.searchParams.set("opportunityId", opportunityId);

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to create job from peer opportunity");

  return (await res.json()) as Job;
}