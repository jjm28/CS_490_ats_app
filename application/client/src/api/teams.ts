// src/api/teams.ts
export type TeamBilling = {
  plan: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Team = {
  _id: string;
  name: string;
  description?: string;
  createdBy?: string;
  adminId?: string;
  billing?: TeamBilling;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamMembershipSummary = {
  teamId: string;
  roles: string[];
  status: string;
  team: Team | null;
};

export type TeamMember = {
  _id: string;
  userId: string;
  roles: string[];
  status: string;
  invitedBy?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  email?: string | null;
  name?: string | null;
  invitedEmail?: string | null;
  invitedByEmail?: string | null;
};

export type TeamWithMembers = {
  team: Team;
  members: TeamMember[];
};

// ---------------------------
// Shared-doc / comments types
// ---------------------------

export type SharedDocComment = {
  _id: string;
  viewerId: string;
  text: string;
  createdAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
};

export type SharedProfileDoc = {
  _id?: string;
  userId?: string;
  isShared?: boolean;
  headline?: string;
  location?: string;
  updatedAt?: string;
};

export type SharedResumeDoc = {
  _id: string;
  owner?: string;
  filename?: string;
  templateKey?: string;
  lastSaved?: string;
  url?: string; // link used by mentors/admins
  comments?: SharedDocComment[];
  isShared?: boolean; // whether it's currently shared
};

export type SharedCoverletterDoc = {
  _id: string;
  owner?: string;
  filename?: string;
  templateKey?: string;
  lastSaved?: string;
  url?: string;
  comments?: SharedDocComment[];
  isShared?: boolean;
};

export type SharedDocKind = "resume" | "coverletter";

export type CandidateSharedDocs = {
  candidate: {
    id: string;
    email?: string;
    name?: string;
  };
  sharedDocs: {
    resumes: SharedResumeDoc[];
    coverletters: SharedCoverletterDoc[];
    profiles: SharedProfileDoc[];
  };
};

export type MySharedDocs = {
  profiles: SharedProfileDoc[];
  resumes: SharedResumeDoc[];
  coverletters: SharedCoverletterDoc[];
};

function getAuthToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    null
  );
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`/api/teams${path}`, {
    ...options,
    headers,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message =
      (body && body.error) ||
      `Request failed with status ${res.status} (${res.statusText})`;
    const error = new Error(message) as any;
    (error as any).status = res.status;
    (error as any).body = body;
    throw error;
  }

  return body;
}

/*export type TeamMessage = {
  _id?: string;
  teamId?: string;
  senderId?: string;
  text: string;
  createdAt?: string;
};*/

export type TeamGoalMilestone = {
  label: string;
  completed?: boolean;
  completedAt?: string;
};

export type TeamGoal = {
  _id: string;
  teamId: string;
  creatorId: string;
  userId: string; // mentee
  title: string;
  description?: string;
  milestones?: TeamGoalMilestone[];
  status: "active" | "completed" | string;
  createdAt: string;
  updatedAt: string;
};

export type TeamInsight = {
  _id?: string;
  teamId: string;
  authorId: string;
  authorName?: string;
  text: string;
  createdAt: string;
};

export type TeamMenteeProgress = {
  mentee: {
    id: string;
    name: string;
    email: string;
  };
  jobStats: any;
  productivity: any;
  goals: {
    totalGoals: number;
    completedGoals: number;
    totalMilestones: number;
    completedMilestones: number;
  };
};

// 🔑 Same auth header pattern as in competitive.ts
function getAuthHeaders() {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// ---------------------------
// Team core API
// ---------------------------

export async function getMyTeams(): Promise<TeamMembershipSummary[]> {
  const data = await fetchWithAuth("");
  return (data?.teams || []) as TeamMembershipSummary[];
}

export async function createTeam(payload: {
  name: string;
  description?: string;
  billingPlan?: string;
}): Promise<{
  _id: string;
  name: string;
  description?: string;
  billing?: TeamBilling;
}> {
  const body = await fetchWithAuth("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body as any;
}

export async function getTeamById(teamId: string): Promise<TeamWithMembers> {
  const body = await fetchWithAuth(`/${encodeURIComponent(teamId)}`, {
    method: "GET",
  });
  return body as TeamWithMembers;
}

export async function inviteToTeam(params: {
  teamId: string;
  email: string;
  role: "mentor" | "candidate";
}): Promise<{
  membership: TeamMember;
  alreadyMember: boolean;
}> {
  const { teamId, email, role } = params;
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/invite`,
    {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }
  );
  return body as any;
}

export async function acceptTeamInvite(teamId: string): Promise<TeamMember> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/accept`,
    {
      method: "POST",
    }
  );
  return body?.membership as TeamMember;
}

export async function declineTeamInvite(teamId: string): Promise<void> {
  await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/decline`,
    {
      method: "POST",
    }
  );
}

export async function updateTeamMemberRoles(params: {
  teamId: string;
  memberUserId: string;
  roles: string[];
}): Promise<TeamMember> {
  const { teamId, memberUserId, roles } = params;
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/members/${encodeURIComponent(
      memberUserId
    )}`,
    {
      method: "PATCH",
      body: JSON.stringify({ roles }),
    }
  );
  return body?.membership as TeamMember;
}

export async function removeTeamMember(params: {
  teamId: string;
  memberUserId: string;
}): Promise<TeamMember> {
  const { teamId, memberUserId } = params;
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/members/${encodeURIComponent(
      memberUserId
    )}`,
    {
      method: "DELETE",
    }
  );
  return body?.membership as TeamMember;
}

// ---------------------------
// Shared docs / feedback
// ---------------------------

export async function getTeamSharedDocs(
  teamId: string
): Promise<CandidateSharedDocs[]> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/shared-docs`,
    { method: "GET" }
  );
  return (body?.candidates || []) as CandidateSharedDocs[];
}

export async function getMySharedDocs(): Promise<MySharedDocs> {
  const body = await fetchWithAuth("/me/shared-docs", { method: "GET" });
  return (body?.sharedDocs || {
    resumes: [],
    coverletters: [],
    profiles: [],
  }) as MySharedDocs;
}

export async function addSharedDocComment(
  sharedId: string,
  type: SharedDocKind,
  text: string
) {
  const body = await fetchWithAuth(
    `/shared-docs/${encodeURIComponent(sharedId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ type, text }),
    }
  );

  return body as {
    message: string;
    comment?: SharedDocComment;
    comments?: SharedDocComment[];
  };
}

export async function getSharedDocComments(
  sharedId: string,
  type: SharedDocKind
): Promise<{ comments: SharedDocComment[] }> {
  const body = await fetchWithAuth(
    `/shared-docs/${encodeURIComponent(
      sharedId
    )}/comments?type=${encodeURIComponent(type)}`
  );

  return (body || { comments: [] }) as { comments: SharedDocComment[] };
}

export async function resolveSharedDocComment(params: {
  sharedId: string;
  commentId: string;
  type: "resume" | "coverletter";
  resolved: boolean;
}) {
  const { sharedId, commentId, type, resolved } = params;

  const res = await fetchWithAuth(
    `/shared-docs/${sharedId}/comments/${commentId}/resolve`, // ✅ relative
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, resolved }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error || `Request failed with status ${res.status} (${res.statusText})`
    );
  }

  return res.json();
}

// ---------------------------
// Sharing toggles (for Sharing Center)
// ---------------------------

/**
 * Toggle sharing of the candidate's profile with their teams.
 */
export async function setProfileSharing(share: boolean): Promise<void> {
  await fetchWithAuth("/me/share/profile", {
    method: "POST",
    body: JSON.stringify({ share }),
  });
}

/**
 * Toggle whether a specific resume is shared with teams.
 */
export async function setResumeSharing(params: {
  resumeId: string;
  share: boolean;
}): Promise<void> {
  const { resumeId, share } = params;
  await fetchWithAuth("/me/share/resume", {
    method: "POST",
    body: JSON.stringify({ resumeId, share }),
  });
}

/**
 * Toggle whether a specific cover letter is shared with teams.
 */
export async function setCoverletterSharing(params: {
  coverletterId: string;
  share: boolean;
}): Promise<void> {
  const { coverletterId, share } = params;
  await fetchWithAuth("/me/share/coverletter", {
    method: "POST",
    body: JSON.stringify({ coverletterId, share }),
  });
}

export async function exportTeamResume(
  teamId: string,
  resumeId: string
): Promise<{ resume: any }> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(
      teamId
    )}/shared-docs/resume/${encodeURIComponent(resumeId)}/export`,
    { method: "GET" }
  );
  return body as { resume: any };
}

export async function exportTeamCoverletter(
  teamId: string,
  coverletterId: string
): Promise<{ coverletter: any }> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(
      teamId
    )}/shared-docs/coverletter/${encodeURIComponent(
      coverletterId
    )}/export`,
    { method: "GET" }
  );
  return body as { coverletter: any };
}

// GET messages

export interface TeamChatMember {
  id: string;
  name: string;
  email?: string | null;
  roles?: string[];
}

export interface TeamMessage {
  _id?: string;
  teamId?: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  scope?: "team" | "direct" | null;
  recipientIds?: string[];
}

export interface TeamMessagesResponse {
  messages: TeamMessage[];
  members: TeamChatMember[];
  currentUserId?: string | null;
}

export interface SendTeamMessagePayload {
  text: string;
  scope?: "team" | "direct";
  recipientIds?: string[];
}

export type TeamJobStatus = "applied" | "not_interested" | null;

export interface TeamJobSuggestion {
  _id: string;
  teamId: string;
  title: string;
  company: string;
  deadline: string; // ISO date from backend
  description?: string;
  location?: string | null;
  link?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  metrics?: {
    appliedCount: number;
    notInterestedCount: number;
  };
  myStatus?: TeamJobStatus;
  appliedCandidates?: {
    userId: string;
    name?: string | null;
    email?: string | null;
    respondedAt?: string | null;
  }[];
}

export type CreateTeamJobPayload = {
  title: string;
  company: string;
  deadline: string; // e.g. "2025-12-31" 
  description?: string;
  location?: string;
  link?: string;
};

//GET messages
export async function getTeamMessages(
  teamId: string
): Promise<TeamMessagesResponse> {
  // Use the same helper as other team APIs so Authorization is attached
  const body = (await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/messages`,
    {
      method: "GET",
    }
  )) as TeamMessagesResponse | TeamMessage[];

  // Backward-compatible: older backend may return a bare array
  if (Array.isArray(body)) {
    return {
      messages: body,
      members: [],
      currentUserId: undefined,
    };
  }

  return body;
}
//POST messages
export async function sendTeamMessage(
  teamId: string,
  payload: SendTeamMessagePayload
): Promise<{ message: TeamMessage }> {
  const body = (await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )) as { message: TeamMessage };

  return body;
}




/**
 * 📈 MENTEE PROGRESS
 * Backend (routes/team-progress.js):
 *  GET /api/teams/:teamId/progress/:userId
 */
export async function getTeamMenteeProgress(
  teamId: string,
  menteeId: string
): Promise<TeamMenteeProgress> {
  const url = `/api/teams/${teamId}/progress/${menteeId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch mentee progress (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as TeamMenteeProgress;
  return data;
}

/**
 * 🎯 GOALS
 * Backend (routes/team-progress.js):
 *  GET  /api/teams/:teamId/goals
 *  POST /api/teams/:teamId/goals
 */

// GET all goals for a team
export async function getTeamGoals(teamId: string): Promise<TeamGoal[]> {
  const url = `/api/teams/${teamId}/goals`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch team goals (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as TeamGoal[];
  return data;
}

// POST new goal
export async function saveTeamGoal(
  teamId: string,
  menteeId: string,
  goalData: {
    title: string;
    description?: string;
    milestones?: TeamGoalMilestone[];
  }
): Promise<TeamGoal> {
  const url = `/api/teams/${teamId}/goals`;

  // 🔥 IMPORTANT: backend expects { title, description, milestones, userId }
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: menteeId,
      title: goalData.title,
      description: goalData.description ?? "",
      milestones: goalData.milestones ?? [],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to save team goal (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as TeamGoal;
  return data;
}

/**
 * ✅ UPDATE GOAL MILESTONE
 * Backend (routes/team-progress.js):
 *  PATCH /api/teams/:teamId/goals/:goalId/milestones/:index
 */
export async function updateGoalMilestone(
  teamId: string,
  goalId: string,
  milestoneIndex: number,
  completed: boolean
): Promise<TeamGoal> {
  const url = `/api/teams/${teamId}/goals/${goalId}/milestones/${milestoneIndex}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ completed }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to update goal milestone (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as TeamGoal;
  return data;
}

export async function markTeamGoalComplete(
  teamId: string,
  goalId: string,
  completed: boolean,
  comment?: string
): Promise<any> {
  const url = `/api/teams/${teamId}/goals/${goalId}/complete`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ completed, comment }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to update goal status (${res.status}). ${text || ""}`
    );
  }

  const data = await res.json();
  return data;
}

/**
 * 💡 INSIGHTS
 * Backend (routes/team-progress.js):
 *  GET  /api/teams/:teamId/insights
 *  POST /api/teams/:teamId/insights
 */

export type TeamInsightMember = {
  id: string;
  name: string;
};

export type TeamInsightsPayload = {
  teamInsights: TeamInsight[];
  personalInsights: TeamInsight[];
  members: TeamInsightMember[];
  canPost: boolean;
};

export type AddTeamInsightPayload = {
  text: string;
  scope?: "team" | "personal";
  recipientIds?: string[];
};

// GET insights
export async function getTeamInsights(
  teamId: string
): Promise<TeamInsightsPayload> {
  const url = `/api/teams/${teamId}/insights`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch team insights (${res.status}). ${text || ""}`
    );
  }

  const data = (await res.json()) as TeamInsightsPayload;
  return data;
}

// POST new insight
// (kept menteeId/source in the signature in case you already call it that way,
// but backend ONLY uses `text` + the JWT user as author)
export async function addTeamInsight(
  teamId: string,
  payload: AddTeamInsightPayload
): Promise<TeamInsight> {
  const url = `/api/teams/${teamId}/insights`;

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    throw new Error(
      `Failed to add team insight (${res.status}). ${responseText || ""}`
    );
  }

  const data = (await res.json()) as TeamInsight;
  return data;
}


//Job suggestions
export async function getTeamJobSuggestions(
  teamId: string
): Promise<TeamJobSuggestion[]> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/jobs`,
    { method: "GET" }
  );

  const jobs = (body && (body as any).jobs) || [];
  return jobs as TeamJobSuggestion[];
}

export async function createTeamJobSuggestionApi(
  teamId: string,
  payload: CreateTeamJobPayload
): Promise<TeamJobSuggestion> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/jobs`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return (body as any).job as TeamJobSuggestion;
}

export async function setTeamJobStatusApi(
  teamId: string,
  jobId: string,
  status: "applied" | "not_interested" | "clear"
): Promise<{ jobId: string; myStatus: TeamJobStatus }> {
  const body = await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/jobs/${encodeURIComponent(
      jobId
    )}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  return body as { jobId: string; myStatus: TeamJobStatus };
}

export async function removeTeamJobSuggestionApi(
  teamId: string,
  jobId: string
): Promise<void> {
  await fetchWithAuth(
    `/${encodeURIComponent(teamId)}/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "DELETE",
    }
  );
}