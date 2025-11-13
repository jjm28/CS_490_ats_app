// Minimal client wrapper for your existing resume routes.
export type TemplateKey = "chronological" | "functional" | "hybrid";

export type ResumeData = {
  name: string;
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
  (import.meta as any).env?.VITE_API_URL ||
  `${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

function getAuthHeaders() {
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
}: {
  userid: string;
  resumeid: string;
  resumedata: ResumeData;
}) {
  const r = await fetch(
    `${API}/resumes/${encodeURIComponent(
      resumeid
    )}/share?userid=${encodeURIComponent(userid)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ resumedata }),
    }
  );
  if (!r.ok) throw new Error("Share failed");
  return r.json();
}

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
