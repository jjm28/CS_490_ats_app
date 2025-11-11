export type ResumeData = {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{ company: string; role: string; start: string; end: string; bullets?: string[] }>;
  education?: Array<{ school: string; degree: string; years?: string }>;
  skills?: string[];
  projects?: Array<{ name: string; link?: string; summary?: string; bullets?: string[] }>;
  meta?: { tags?: string; [k: string]: any };
};

export type ResumeDoc = {
  _id: string;
  userid: string;
  filename: string;
  templateKey: "chronological" | "functional" | "hybrid";
  resumedata: ResumeData;
  lastSaved?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""; // e.g., "http://localhost:5050"
const json = (x: any) => ({ "Content-Type": "application/json", ...(x || {}) });

async function handle(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message || body?.error || msg;
      const code = body?.code;
      throw Object.assign(new Error(msg), { code, status: res.status, details: body });
    } catch {
      throw new Error(msg);
    }
  }
  // No content
  if (res.status === 204) return null;
  return res.json();
}

/** List all resumes for a user */
export async function listResumes(params: { userid: string }): Promise<ResumeDoc[]> {
  const url = new URL(`${API_BASE}/api/resumes`);
  url.searchParams.set("userid", params.userid);
  const res = await fetch(url.toString(), { method: "GET" });
  return handle(res);
}

/** Create a resume (usually from a selected template) */
export async function saveResume(input: {
  userid: string;
  filename: string;
  templateKey: ResumeDoc["templateKey"];
  resumedata: ResumeData;
  lastSaved?: string;
}): Promise<{ _id: string }> {
  const res = await fetch(`${API_BASE}/api/resumes`, {
    method: "POST",
    headers: json(null),
    body: JSON.stringify(input),
  });
  return handle(res);
}

/** Get one resume with full data */
export async function getFullResume(params: {
  userid: string;
  resumeid: string;
}): Promise<ResumeDoc> {
  const url = new URL(`${API_BASE}/api/resumes/${params.resumeid}`);
  url.searchParams.set("userid", params.userid);
  const res = await fetch(url.toString(), { method: "GET" });
  return handle(res);
}

/** Update filename/data (and lastSaved timestamp) */
export async function updateResume(input: {
  resumeid: string;
  userid: string;
  filename?: string;
  resumedata?: ResumeData;
  templateKey?: ResumeDoc["templateKey"]; // if user switches layout
  lastSaved?: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/api/resumes/${input.resumeid}`, {
    method: "PUT",
    headers: json(null),
    body: JSON.stringify(input),
  });
  return handle(res);
}

/** Delete a resume */
export async function deleteResume(params: { resumeid: string; userid: string }): Promise<{ ok: true }> {
  const url = new URL(`${API_BASE}/api/resumes/${params.resumeid}`);
  url.searchParams.set("userid", params.userid);
  const res = await fetch(url.toString(), { method: "DELETE" });
  return handle(res);
}

/** Create a share link for a resume (read-only shared view) */
export async function createSharedResume(input: {
  userid: string;
  resumeid: string;
}): Promise<{ url: string; sharedid: string }> {
  const res = await fetch(`${API_BASE}/api/resumes/${input.resumeid}/share`, {
    method: "POST",
    headers: json(null),
    body: JSON.stringify(input),
  });
  return handle(res);
}

/** Load a shared resume via shared id (no auth required) */
export async function fetchSharedResume(params: {
  sharedid: string;
}): Promise<{
  filename: string;
  templateKey: ResumeDoc["templateKey"];
  resumedata: ResumeData;
  lastSaved?: string;
}> {
  const res = await fetch(`${API_BASE}/api/resumes/shared/${params.sharedid}`, { method: "GET" });
  return handle(res);
}

/* ---------------- Optional template helpers (only if you keep templates.ts) ---------------- */

/** Get available resume templates (from server) */
export async function listResumeTemplates(): Promise<
  Array<{ key: ResumeDoc["templateKey"]; title: string; blurb?: string; default?: boolean }>
> {
  const res = await fetch(`${API_BASE}/api/resume-templates`, { method: "GET" });
  return handle(res);
}

/** Set default template for new resumes (per user/org) */
export async function setDefaultResumeTemplate(input: {
  userid: string;
  templateKey: ResumeDoc["templateKey"];
}): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/api/resume-templates/default`, {
    method: "POST",
    headers: json(null),
    body: JSON.stringify(input),
  });
  return handle(res);
}