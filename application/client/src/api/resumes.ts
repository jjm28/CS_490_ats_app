import type { ResumeFeedbackComment } from "../components/Resume/ResumeShareView";
import API_BASE from "../utils/apiBase";
import type { ReviewerPermission, SharingMeta, WorkflowStatus } from "./coverletter";

// Minimal client wrapper for your existing resume routes.
export type TemplateKey = "chronological" | "functional" | "hybrid";

export type ContactInfo = {
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
};

export interface ProfileExperience {
  company: string;
  jobTitle: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export type ResumeData = {
  name: string;
  contact?: ContactInfo;
  summary?: string;
  experience?: any[];
  education?: any[];
  skills?: any[];
  projects?: any[];
  style?: {
    color?: { primary?: string };
    font?: { family?: string; sizeScale?: "S" | "M" | "L" };
    layout?: { columns?: 1 | 2 };
  };
};

export type ResumeSummary = {
  _id: string;
  filename: string;
  templateKey: TemplateKey;
  lastSaved?: string;
  tags?: string;
};

const API =
  `${API_BASE}/api`;

export default function getAuthHeaders() {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  const token = (u?.token || localStorage.getItem("token") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

/* ------------ CRUD + share ------------ */
export interface GetSharedResumeResponse {
  _id: string;
  owner: string;
  filename: string;
  templateKey: TemplateKey;
  resumedata: ResumeData;
  lastSaved: string;
  visibility? : "public" | "unlisted" | "restricted"
restricteduserid? : [string]
sharing?: SharingMeta
comments: ResumeFeedbackComment[]
  reviewers?: ReviewerPermission[];
   reviewDeadline?: string;
}

export async function listResumes({
  userid,
}: {
  userid: string;
}): Promise<ResumeSummary[]> {
  const r = await fetch(
    `${API}/resumes?userid=${encodeURIComponent(userid)}`,
    { headers: getAuthHeaders() }
  );
  if (!r.ok) throw new Error("Failed to list resumes");
  return r.json();
}

export async function getFullResume({
  userid,
  resumeid,
}: {
  userid: string;
  resumeid: string;
}) {
  const r = await fetch(
    `${API}/resumes/${encodeURIComponent(
      resumeid
    )}?userid=${encodeURIComponent(userid)}`,
    {
      headers: getAuthHeaders(),
    }
  );
  if (!r.ok) throw new Error("Failed to fetch resume");
  return r.json();
}

export async function saveResume({
  userid,
  filename,
  templateKey,
  resumedata,
  lastSaved,
}: {
  userid: string;
  filename: string;
  templateKey: TemplateKey;
  resumedata: ResumeData;
  lastSaved?: string;
}) {
  const r = await fetch(`${API}/resumes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userid,
      filename,
      templateKey,
      resumedata,
      lastSaved,
    }),
  });
  if (!r.ok) throw new Error("Create failed");
  return r.json();
}

export async function updateResume({
  resumeid,
  userid,
  filename,
  resumedata,
  lastSaved,
  templateKey,
  tags,
}: {
  resumeid: string;
  userid: string;
  filename?: string;
  resumedata?: ResumeData;
  lastSaved?: string;
  templateKey?: TemplateKey;
  tags?: string;
}) {
  const r = await fetch(`${API}/resumes/${encodeURIComponent(resumeid)}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userid,
      filename,
      resumedata,
      lastSaved,
      templateKey,
      tags,
    }),
  });
  if (!r.ok) throw new Error("Update failed");
  return r.json();
}

export async function deleteResumeApi({
  userid,
  resumeid,
}: {
  userid: string;
  resumeid: string;
}) {
  const r = await fetch(
    `${API}/resumes/${encodeURIComponent(
      resumeid
    )}?userid=${encodeURIComponent(userid)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  if (!r.ok && r.status !== 204) throw new Error("Delete failed");
  return true;
}

export async function createSharedResume({
  userid,
  resumeid,
  resumedata,
  visibility,
  allowComments,
   
           reviewDeadline 
}: {
  userid: string;
  resumeid: string;
  resumedata: ResumeData;
  visibility: string,
  allowComments: boolean,

           reviewDeadline: string
}) {
  const r = await fetch(
    `${API}/resumes/${encodeURIComponent(
      resumeid
    )}/share?userid=${encodeURIComponent(userid)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ resumedata,visibility,allowComments,reviewDeadline}),
    }
  );
  if (!r.ok) throw new Error("Share failed");
  return r.json();
}

export  const fetchSharedResume = async (uid: string,sharedid:string,currentUseremail:string  ): Promise<GetSharedResumeResponse> => {
         const res = await fetch(
        `${API}/resumes/shared/${encodeURIComponent(uid)}/${encodeURIComponent(sharedid)}/${encodeURIComponent(currentUseremail)}`,
          {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
          }
        );

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetSharedResumeResponse>;
};
/* ------------ AI handling ------------ */

// Keep these exports so other files can still import them
export type AiResumeCandidate = {
  summarySuggestions?: string[];
  skills: string[];
  atsKeywords: string[];
  experienceBullets: Array<{
    sourceExperienceIndex: number;
    company: string;
    jobTitle: string;
    bullets: string[];
    startDate?: string;
    endDate?: string;
    location?: string;
  }>;
};

// Make this loose so NewResume/ResumeEditor can safely access parsedCandidates, data, etc.
export type AiResumeResponse = any;

export type AiResumeRequest = {
  userid: string;
  Jobdata: any;
};

export async function GetAiResumeContent(
  req: AiResumeRequest
): Promise<AiResumeResponse> {
  const { userid, Jobdata } = req;

  // Clean job object so server doesn't choke on Mongo fields
  const cleanJob: any = { ...Jobdata };
  delete cleanJob._id;
  delete cleanJob.userId;
  delete cleanJob.createdAt;
  delete cleanJob.updatedAt;
  delete cleanJob.__v;

  // Build headers: reuse auth + add dev-user headers so attachDevUser can work
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };

  const raw = localStorage.getItem("authUser");
  const userObj = raw ? JSON.parse(raw).user || JSON.parse(raw) : null;
  const uid = userObj?._id;
  if (uid) {
    headers["x-user-id"] = String(uid);
    headers["x-dev-user-id"] = String(uid);
  }

  const url = `${API}/resumes/generate-resumeai`; // <- uses /api/resumes/... (no double /api)

  const res = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ userid, Jobdata: cleanJob }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `AI generation failed (${res.status}). ${
        text || "Make sure /api/resumes/generate-resumeai exists and returns JSON."
      }`
    );
  }

  const data = await res.json();
  if (data?.error) {
    throw new Error(data?.message || "AI generation service error.");
  }

  return data;
}

// --- Resume Versions API ---
// ---- Resume Version APIs ----

// List versions for a resume
export async function fetchResumeVersions({
  userid,
  resumeid,
}: {
  userid: string;
  resumeid: string;
}) {
  const r = await fetch(
    `${API}/resume-versions?userid=${userid}&resumeid=${resumeid}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error("Failed to fetch versions");
  return r.json(); // { items, defaultVersionId }
}

// Get a single version (with full content)
export async function fetchResumeVersion({
  userid,
  versionid,
}: {
  userid: string;
  versionid: string;
}) {
  const r = await fetch(
    `${API}/resume-versions/${versionid}?userid=${userid}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error("Failed to fetch version");
  return r.json();
}

// Create a new version (from base or from another version)
export async function createResumeVersionNew(args: {
  userid: string;
  resumeid: string;
  sourceVersionId?: string | null;
  name?: string;
  description?: string;
}) {
  const r = await fetch(`${API}/resume-versions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error("Failed to create version");
  return r.json();
}

/**
 * Patch version META ONLY:
 * - name
 * - description
 * - status ("active" | "archived")
 * - linkJobIds / unlinkJobIds
 *
 * This matches your backend PATCH /api/resume-versions/:id
 * and works with:
 *   patchResumeVersionMeta({ userid, versionid, status: "archived" })
 */
export async function patchResumeVersionMeta({
  userid,
  versionid,
  name,
  description,
  status,
  linkJobIds,
  unlinkJobIds,
}: {
  userid: string;
  versionid: string;
  name?: string;
  description?: string;
  status?: "active" | "archived";
  linkJobIds?: string[];
  unlinkJobIds?: string[];
}) {
  const payload: any = { userid };

  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;
  if (status !== undefined) payload.status = status;
  if (Array.isArray(linkJobIds) && linkJobIds.length)
    payload.linkJobIds = linkJobIds;
  if (Array.isArray(unlinkJobIds) && unlinkJobIds.length)
    payload.unlinkJobIds = unlinkJobIds;

  const r = await fetch(
    `${API}/resume-versions/${versionid}?userid=${userid}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!r.ok) throw new Error("Failed to update version");
  return r.json();
}

// Delete a version
export async function deleteResumeVersionById({
  userid,
  versionid,
}: {
  userid: string;
  versionid: string;
}) {
  const r = await fetch(
    `${API}/resume-versions/${versionid}?userid=${userid}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!r.ok) throw new Error("Delete failed");
  return true;
}

// Set a version as the default/master for its resume
export async function setDefaultResumeVersion({
  userid,
  versionid,
}: {
  userid: string;
  versionid: string;
}) {
  const r = await fetch(
    `${API}/resume-versions/${versionid}/set-default?userid=${userid}`,
    { method: "POST", credentials: "include" }
  );
  if (!r.ok) throw new Error("Failed to set default");
  return r.json(); // { ok, defaultVersionId }
}

// Compare two versions
export async function compareResumeVersions({
  userid,
  leftVersionId,
  rightVersionId,
}: {
  userid: string;
  leftVersionId: string;
  rightVersionId: string;
}) {
  const r = await fetch(`${API}/resume-versions/compare`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid, leftVersionId, rightVersionId }),
  });
  if (!r.ok) throw new Error("Compare failed");
  return r.json(); // diff object from backend
}

// Merge two versions into a new version
export async function mergeResumeVersions({
  userid,
  baseId,
  incomingId,
  resolution,
  name,
  description,
}: {
  userid: string;
  baseId: string;
  incomingId: string;
  resolution: any;
  name: string;
  description?: string;
}) {
  const r = await fetch(`${API}/resume-versions/merge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid, baseId, incomingId, resolution, name, description }),
  });
  if (!r.ok) throw new Error("Merge failed");
  return r.json();
}

/**
 * Full content update for a version (PUT):
 * used when editing a version's resume body in the editor.
 */
export async function updateResumeVersionContent({
  userid,
  versionid,
  content,
  name, // optional
}: {
  userid: string;
  versionid: string;
  content: ResumeData;
  name?: string;
}) {
  const res = await fetch(`${API}/resume-versions/${versionid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid, content, name }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update version");
  return res.json();
}

export async function compareResumeVersionsAPI(params: {
  userid: string;
  leftVersionId: string;
  rightVersionId: string;
}) {
  const { userid, leftVersionId, rightVersionId } = params;

  const res = await fetch(`${API}/resume-versions/compare`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid, leftVersionId, rightVersionId }),
  });

  if (!res.ok) {
    throw new Error("Compare failed");
  }

  // will look like: { meta: { left, right }, fields: { summary, skills, experience } }
  return res.json();
}

export async function getProfileContact(): Promise<{
  name?: string;
  contact: ContactInfo;
}> {
  const res = await fetch(`${API}/profile`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to load profile");
  }

  const json: any = await res.json();

  console.log("PROFILE FROM /profile (raw):", json);

  const profile: any = Array.isArray(json) ? json[0] : json;

  console.log("PROFILE used for mapping:", profile);

  // ----- EMAIL -----
  const email =
    profile.email ??
    profile.user?.email ??
    profile.contact?.email ??
    profile.profile?.email;

  // ----- PHONE -----
  const phoneCandidates = [
    profile.phone,
    profile.phoneNumber,
    profile.phonenumber,
    profile.mobile,
    profile.mobilePhone,
    profile.contact?.phone,
    profile.profile?.phone,
    profile.user?.phone,
  ];

  const phone: string | undefined =
    phoneCandidates.find(
      (v) => typeof v === "string" && v.trim().length > 0
    ) ?? undefined;

  // ----- LOCATION (fix is here) -----
  let location: string | undefined;

  // If backend already gives a string, just use it
  if (typeof profile.location === "string") {
    location = profile.location;
  } else {
    // Otherwise, try to build "City, ST" from object fields
    const city =
      profile.city ??
      profile.town ??
      profile.address?.city ??
      profile.location?.city;

    const state =
      profile.state ??
      profile.region ??
      profile.address?.state ??
      profile.location?.state;

    const country =
      profile.country ??
      profile.address?.country ??
      profile.location?.country;

    const parts = [city, state || country].filter(
      (p) => typeof p === "string" && p.trim().length > 0
    );

    if (parts.length) {
      location = parts.join(", "); // e.g. "Newark, NJ"
    }
  }

  // ----- NAME -----
  const nameCandidates = [
    profile.fullName,
    profile.name,
    profile.displayName,
    profile.username,
    profile.user?.name,
    profile.profile?.name,
    profile.profile?.fullName,
  ];

  const name: string | undefined =
    nameCandidates.find(
      (v) => typeof v === "string" && v.trim().length > 0
    ) ?? undefined;

  const contact: ContactInfo = {
    email: email ?? undefined,
    phone: phone ?? undefined,
    location: location ?? undefined, // <-- now always string or undefined
    website:
      profile.website ??
      profile.profile?.website ??
      profile.contact?.website ??
      undefined,
    linkedin:
      profile.linkedin ??
      profile.profile?.linkedin ??
      profile.contact?.linkedin ??
      undefined,
    github:
      profile.github ??
      profile.profile?.github ??
      profile.contact?.github ??
      undefined,
  };

  console.log("getProfileContact mapped contact:", { name, contact });

  return { name, contact };
}


export interface UpdateWorkflowResponse {
  workflowStatus: WorkflowStatus;
  approvedByName?: string;
  approvedAt?: string;
}
 interface UpdateWorkflowRequest {
  resumeid: string;
  status: WorkflowStatus;
}
export async function updateResumeWorkflow(
  params: UpdateWorkflowRequest
): Promise<UpdateWorkflowResponse> {
  const { resumeid, status } = params;
  const API_URL = `${API}/resumes/`;
  const res = await fetch(`${API_URL}${resumeid}/workflow`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update workflow status");
  }
  return data as UpdateWorkflowResponse;
}


export interface FeedbackTheme {
  label: string;
  description: string;
  frequency?: number;
  exampleComments?: string[];
}

export interface FeedbackSummaryAI {
  themes: FeedbackTheme[];
  strengths: string[];
  improvementSuggestions: string[];
}

export interface FeedbackSummaryByRole {
  role: "mentor" | "peer" | "advisor" | "recruiter" | "other" | "unknown" | string;
  reviewers: number;
  comments: number;
  resolvedComments: number;
}

export interface FeedbackSummaryResponse {
  resumeid: string;
  totalReviewers: number;
  statusCounts: Record<string, number>;
  totalComments: number;
  openComments: number;
  resolvedComments: number;
  byRole: FeedbackSummaryByRole[];
  aiSummary: FeedbackSummaryAI | null;
}

export interface GetFeedbackSummaryRequest {
  userid: string;
  resumeid: string;
}

export async function getResumeFeedbackSummary(
  params: GetFeedbackSummaryRequest
): Promise<FeedbackSummaryResponse> {
  const { userid, resumeid } = params;
  const API_URL = `${API}/resumes/`;

  const url = `${API_URL}${resumeid}/feedback-summary?userid=${encodeURIComponent(
    userid
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load feedback summary");
  }

  return data as FeedbackSummaryResponse;
}

