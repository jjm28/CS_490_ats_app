import { v4 as uuidv4 } from "uuid";

// Support either env name (same pattern as profiles.ts)
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5050";

function getDevUserId(): string {
  // Keep one per browser (aligns with your dev middleware)
  let id = localStorage.getItem("devUserId");
  if (!id) {
    const ns = localStorage.getItem("devUserNs") || "dev";
    id = `${ns}-${uuidv4().slice(0, 8)}`;
    localStorage.setItem("devUserId", id);
  }
  return id;
}

function authHeaders() {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-dev-user-id": getDevUserId(), // dev-only header so backend attaches user
  };
}

// ----- Types -----
export type TemplateType = "chronological" | "functional" | "hybrid" | "custom";

export type Resume = {
  _id: string;
  name: string;
  templateId: string;
  ownerId?: string;
  content: any; // free-form editor payload
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ResumeCreatePayload = {
  name: string;
  templateId: string;
  content?: any;
};

export type ResumeUpdatePayload = Partial<Pick<Resume, "name" | "templateId" | "content" | "archived">>;

// Base path
const EP = "/api/resumes";

// ----- API calls -----
export async function listResumes(): Promise<Resume[]> {
  const res = await fetch(API_BASE + EP, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`List resumes failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getResume(id: string): Promise<Resume> {
  const res = await fetch(`${API_BASE + EP}/${id}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Get resume failed (${res.status})`);
  return data;
}

export async function createResume(payload: ResumeCreatePayload): Promise<Resume> {
  const res = await fetch(API_BASE + EP, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Create resume failed (${res.status})`);
  return data;
}

export async function updateResume(id: string, payload: ResumeUpdatePayload): Promise<Resume> {
  const res = await fetch(`${API_BASE + EP}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Update resume failed (${res.status})`);
  return data;
}

export async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`${API_BASE + EP}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let msg = `Delete resume failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
}
