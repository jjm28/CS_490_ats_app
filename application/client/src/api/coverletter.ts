import type { Template } from "../components/Coverletter/Coverletterstore";
import type { Job } from "../components/Coverletter/hooks/useJobs";

// Constants
const API_URL = "http://localhost:5050/api/coverletter/";



export const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// Interfaces
export interface Coverletter {
  userid: string;
  filename: string;
  templateKey: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
}

export type CoverletterFeedbackComment = {
  _id: string;
  authorName: string;
  authorRole?: string;
  message: string;
  createdAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedByName?: string;
};



export type SharingMeta = {
  ownerName?: string;
  ownerEmail?: string;
  visibility?: "public" | "unlisted" | "restricted";
  allowComments?: boolean;
  canComment?: boolean; // this specific viewer can comment or not
  isOwner?: boolean; // is the current viewer the owner
  canResolve? : boolean
   viewerRole?: string | null;      // "Mentor", "Recruiter", etc.
  reviewDueAt?: string | null;
};
export interface ListCoverletter {
  userid: string;

}
export interface GetCoverletter {
  userid: string;
  coverletterid: string;

}

export interface ReviewerPermission {
  email: string;
  role: ReviewerRole;
  canComment: boolean;
  canResolve: boolean;
  status: ReviewerStatus;
  lastActivityAt?: Date;
  completedAt?: Date;
}

export type ReviewerRole = "mentor" | "peer" | "advisor" | "recruiter" | "other";
export type ReviewerStatus = "invited" | "viewed" | "commented" | "completed";

export interface GetCoverletterResponse {
  userid: string;
  filename: string;
  templateKey: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
  allowComments?: boolean
  
visibility? : "public" | "unlisted" | "restricted"
restricteduserid? : [string]
  reviewers?: ReviewerPermission[];
   reviewDeadline?: string;

  workflowStatus?: WorkflowStatus;
  approvedByName?: string;
  approvedAt?: string;
}

export interface ReviewImpactSnapshotRequest {
  coverletterid: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  outcome?: string; // "applied" | "interview" | "offer" | "rejected" | etc.
}

export interface ReviewImpactSnapshotResponse {
  _id: string;
  owner: string;
  coverletterId: string;
  jobId: string;
  jobTitle?: string | null;
  companyName?: string | null;
  outcome: string;
  snapshotAt: string;
  reviewStats: {
    workflowStatus: string;
    isReviewed: boolean;
    totalReviewers: number;
    statusCounts: Record<string, number>;
    totalComments: number;
    openComments: number;
    resolvedComments: number;
    byRole: Array<{
      role: string;
      reviewers: number;
      comments: number;
      resolvedComments: number;
    }>;
    percentReviewersCompleted: number;
  };
}

export interface ReviewImpactBucket {
  applications: number;
  interviews: number;
  offers: number;
  interviewRate: number;
  offerRate: number;
}

export interface ReviewImpactMetrics {
  totalApplications: number;
  withReviewed: ReviewImpactBucket;
  withoutReviewed: ReviewImpactBucket;
  breakdownByWorkflowStatus: Array<
    ReviewImpactBucket & { workflowStatus: string }
  >;
}

export async function recordReviewImpactSnapshot(
  payload: ReviewImpactSnapshotRequest
): Promise<ReviewImpactSnapshotResponse> {
  const res = await fetch(`${API_URL}review-impact/snapshot`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to record review impact snapshot");
  }
  return data as ReviewImpactSnapshotResponse;
}

export async function getReviewImpactMetrics(): Promise<ReviewImpactMetrics> {
  const res = await fetch(`${API_URL}review-impact/metrics`, {
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load review impact metrics");
  }
  return data as ReviewImpactMetrics;
}



export interface UpdateCoverletter {
  coverletterid: string;
  userid: string;
  filename: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
}

export interface PostCoverletterResponse {
  _id: string
}

export interface CoverletterSummary {
  _id: string;
  filename: string;
  templateKey: Template["key"];
  lastSaved: string;

}

export type ListCoverlettersResponse = CoverletterSummary[];

// =========================
// COVER LETTER BASE TYPES
// =========================

export type CoverLetterData = {
  name: string;
  phonenumber: string;
  email: string;
  address: string;
  date: string;
  recipientLines: string[];
  greeting: string;
  paragraphs: string[] | string;
  closing: string;
  signatureNote: string;
};

// =========================
// RELEVANT EXPERIENCE TYPE
// =========================

export type RelevantExperience = {
  title: string;
  company: string;
  relevanceScore: number; // 0–100
  reason: string;         // Explanation for score
};

// =========================
// AI CANDIDATE OUTPUT TYPE
// =========================
// This extends normal CoverLetterData
// and adds AI metadata such as relevance scores

export type CoverLetterAIResult = CoverLetterData & {
  relevantExperiences?: RelevantExperience[];
  // (You can add future AI metadata here too)
};

// =========================
// FULL AI RESPONSE TYPE
// =========================

export type AIcoverletterPromptResponse = {
  rawText: string;                // Full LLM response (optional but useful)
  parsedCandidates: CoverLetterAIResult[];  // Multiple versions from LLM
};



export interface UpdateWorkflowRequest {
  coverletterid: string;
  status: WorkflowStatus;
}

export interface UpdateWorkflowResponse {
  workflowStatus: WorkflowStatus;
  approvedByName?: string;
  approvedAt?: string;
}

export async function updateCoverletterWorkflow(
  params: UpdateWorkflowRequest
): Promise<UpdateWorkflowResponse> {
  const { coverletterid, status } = params;

  const res = await fetch(`${API_URL}${coverletterid}/workflow`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update workflow status");
  }
  return data as UpdateWorkflowResponse;
}

export  const Getfullcoverletter = async (  coverletterinfo: GetCoverletter ): Promise<GetCoverletterResponse> => {
  const res = await fetch(API_URL+ `?userid=${coverletterinfo.userid}&coverletterid=${coverletterinfo.coverletterid}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetCoverletterResponse>;
};


export  const listCoverletters = async (  coverletterinfo: ListCoverletter ): Promise<ListCoverlettersResponse> => {
  const res = await fetch(API_URL+ `?userid=${coverletterinfo.userid}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<ListCoverlettersResponse>;
};


// API Function
export  const saveCoverletter = async (  coverletterinfo: Coverletter ): Promise<PostCoverletterResponse> => {
  const res = await fetch(API_URL + "save", {
    method: "POST",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostCoverletterResponse>;
};

export  const  updateCoverletter = async (  coverletterinfo: UpdateCoverletter ): Promise<PostCoverletterResponse> => {
  const res = await fetch(API_URL + "update", {
    method: "PUT",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostCoverletterResponse>;
};

export type WorkflowStatus = "draft" | "in_review" | "approved" | "changes_requested";



export interface CreateSharedCoverletter {
  userid: string;
  coverletterid: string;
  coverletterdata: CoverLetterData;
    visibility?: string,
  allowComments?: boolean,
   reviewDeadline: string
}
export interface PostSharedCoverletterResponse {
  sharedid: string;
  url: string;
  owner: string;
}
export  const createdsharedcoverletter = async (  coverletterinfo: CreateSharedCoverletter ): Promise<PostSharedCoverletterResponse> => {
  const res = await fetch(API_URL + "share", {
    method: "POST",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostSharedCoverletterResponse>;
};

export interface fetchSharedCoverletter {
sharedid: string;
currentUseremail: string;
}
export interface GetSharedCoverletterResponse {
  _id: string;
  owner: string;
  filename: string;
  templateKey: Template["key"];
  coverletterdata: CoverLetterData;
  lastSaved: string;
  visibility? : "public" | "unlisted" | "restricted"
restricteduserid? : [string]
sharing?: SharingMeta
comments: CoverletterFeedbackComment[]
  reviewers?: ReviewerPermission[];
   reviewDeadline?: string;
}
export  const fetchSharedCoverletter = async (  coverletterinfo: fetchSharedCoverletter ): Promise<GetSharedCoverletterResponse> => {
  const res = await fetch(API_URL+ `share?sharedid=${coverletterinfo.sharedid}&currentUseremail=${coverletterinfo.currentUseremail}` , {
    headers: authHeaders() ,  });
  console.log(API_URL+ `/share?sharedid=${coverletterinfo.sharedid}`)
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetSharedCoverletterResponse>;
};

export interface GetmostpopularCoverletterResponse {
  templateKey: Template["key"];

}
export  const GetmostpopularCoverletter = async ( ): Promise<GetmostpopularCoverletterResponse> => {
  const res = await fetch(API_URL+ "mostpop" , {
    headers: authHeaders() ,  });
  const data = await res.json() ?? {    "templateKey": "formal" };
  console.log(data)
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetmostpopularCoverletterResponse>;
};

export interface AIGenerateRequest {
  job_title: string;
  company_name: string;
  company_summary?: string;
  company_address?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_address?: string;
  user_skills?: string[] | string;
  user_experience?: string | number;
}

export interface AIGenerateResponse {
  success: boolean;
  cover_letter: string;
  company_research?: {
    name: string;
    mission?: string;
    recent_news?: string[];
    ai_summary?: string;
  };
  error?: string;
}

// === AI GENERATION API ===
export const AIGenerateCoverletter = async (
  payload: AIGenerateRequest
): Promise<AIGenerateResponse> => {
  const API = import.meta.env.VITE_API_URL || `http://${location.hostname}:8000`;


  const res = await fetch(`${API}/coverletter/ai-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI generation failed");
  }

  return data as AIGenerateResponse;
};

// Add types
export type ToneSettings = {
  tone: "formal" | "casual" | "enthusiastic" | "analytical";
  style: "narrative" | "direct" | "bullet";
  culture: "corporate" | "startup";
  length: "brief" | "standard" | "detailed";
  custom?: string;
};

export interface AIcoverletterPromptSchema {
userid: string, 
Jobdata: Job
toneSettings? : ToneSettings;
experienceMode?: boolean;
}




export  const GetAiGeneratedContent = async (  AIcoverletterPrompt: AIcoverletterPromptSchema): Promise<AIcoverletterPromptResponse> => {
    console.log("Getting Data", API_URL+ "generate-coverletterai")

  const res = await fetch(API_URL+ "generate-coverletterai" , {
    method: "POST",
    headers: authHeaders() ,    
    body: JSON.stringify(AIcoverletterPrompt)}
  );
  const data = await res.json();
  console.log("got Data",data)
  if (!res.ok) {
   
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<AIcoverletterPromptResponse>;
};


// ---- Feedback summary types ----

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
  coverletterId: string;
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
  coverletterid: string;
}

// ---- Fetch feedback summary (stats + optional AI themes) ----
export async function getCoverletterFeedbackSummary(
  params: GetFeedbackSummaryRequest
): Promise<FeedbackSummaryResponse> {
  const { userid, coverletterid } = params;

  const url = `${API_URL}${coverletterid}/feedback-summary?userid=${encodeURIComponent(
    userid
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load feedback summary");
  }

  return data as FeedbackSummaryResponse;
}
