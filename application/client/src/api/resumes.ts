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
  const token = (u?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

/* CRUD + share */
export async function listResumes({ userid }: { userid: string }): Promise<ResumeSummary[]> {
  const r = await fetch(`${API}/resumes?userid=${encodeURIComponent(userid)}`, { headers: getAuthHeaders() });
  if (!r.ok) throw new Error("Failed to list resumes");
  return r.json();
}

export async function getFullResume({ userid, resumeid }: { userid: string; resumeid: string }) {
  const r = await fetch(`${API}/resumes/${encodeURIComponent(resumeid)}?userid=${encodeURIComponent(userid)}`, {
    headers: getAuthHeaders(),
  });
  if (!r.ok) throw new Error("Failed to fetch resume");
  return r.json();
}

export async function saveResume({
  userid, filename, templateKey, resumedata, lastSaved,
}: {
  userid: string; filename: string; templateKey: TemplateKey; resumedata: ResumeData; lastSaved?: string;
}) {
  const r = await fetch(`${API}/resumes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userid, filename, templateKey, resumedata, lastSaved }),
  });
  if (!r.ok) throw new Error("Create failed");
  return r.json();
}

export async function updateResume({
  resumeid, userid, filename, resumedata, lastSaved, templateKey, tags,
}: {
  resumeid: string; userid: string; filename?: string; resumedata?: ResumeData; lastSaved?: string; templateKey?: TemplateKey; tags?: string;
}) {
  const r = await fetch(`${API}/resumes/${encodeURIComponent(resumeid)}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userid, filename, resumedata, lastSaved, templateKey, tags }),
  });
  if (!r.ok) throw new Error("Update failed");
  return r.json();
}

export async function deleteResumeApi({ userid, resumeid }: { userid: string; resumeid: string }) {
  const r = await fetch(`${API}/resumes/${encodeURIComponent(resumeid)}?userid=${encodeURIComponent(userid)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!r.ok && r.status !== 204) throw new Error("Delete failed");
  return true;
}

export async function createSharedResume({ userid, resumeid, resumedata }: {
  userid: string; resumeid: string; resumedata: ResumeData;
}) {
  const r = await fetch(`${API}/resumes/${encodeURIComponent(resumeid)}/share?userid=${encodeURIComponent(userid)}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ resumedata }),
  });
  if (!r.ok) throw new Error("Share failed");
  return r.json();
}

/* Optional: barebones AI stub (no server required) */
export async function GetAiGeneratedResume(_: { userid: string; job?: any }) {
  return {
    data: {
      name: "Your Name",
      summary: "Results-driven developer with experience in TypeScript, React, and Node.js.",
      experience: [],
      education: [],
      skills: [{ name: "TypeScript" }, { name: "React" }, { name: "Node.js" }],
      projects: [],
      style: { color: { primary: "#111827" }, font: { family: "Sans", sizeScale: "M" }, layout: { columns: 1 } },
    } as ResumeData,
  };
}
