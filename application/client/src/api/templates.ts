// application/client/src/api/templates.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5050";

function authHeaders() {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  const dev = localStorage.getItem("devUserId");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(dev ? { "x-dev-user-id": dev } : {}),
  };
}

export type TemplateType = "chronological" | "functional" | "hybrid" | "custom";
export type Template = {
  _id: string;
  name: string;
  type: TemplateType;
  style?: { primary?: string; font?: string };
  layout?: { columns?: 1 | 2; sections?: string[] };
  isDefaultForOwner?: boolean;
};

export async function listTemplates(): Promise<Template[]> {
  const r = await fetch(`${API_BASE}/api/templates`, { credentials: "include", headers: authHeaders() });
  if (!r.ok) throw new Error("List templates failed");
  return r.json();
}

export async function cloneTemplate(id: string) {
  const r = await fetch(`${API_BASE}/api/templates/${id}/clone`, { method: "POST", credentials: "include", headers: authHeaders() });
  if (!r.ok) throw new Error("Clone failed");
  return r.json();
}

export async function getTemplate(id: string) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Get template failed (${res.status})`);
  return data;
}

export async function updateTemplate(id: string, body: Partial<Template>) {
  const r = await fetch(`${API_BASE}/api/templates/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Update template failed");
  return r.json();
}
/*
export async function importTemplateFromResume(resumeId: string, name: string) { // NEW
  const r = await fetch(`${API_BASE}/api/templates/import-from-resume`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ resumeId, name }),
  });
  if (!r.ok) throw new Error("Import template failed");
  return r.json();
}
*/
export async function importTemplate(payload: {
  name: string;
  type?: "chronological" | "functional" | "hybrid" | "custom";
  style?: any;
  layout?: any;
  previewHtml?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/templates/import`, { 
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Import failed");
  return data;
}

export async function getDefaultTemplate() {
  const res = await fetch(`${API_BASE}/api/templates/default`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error("Failed to get default");
  return res.json();
}

export async function setDefaultTemplate(id: string) {
  const res = await fetch(`${API_BASE}/api/templates/${id}/default`, {
    method: "POST",                   // <-- POST (not PUT)
    credentials: "include",
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Set default failed");
  return data;                        // returns the updated template
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Delete failed");
}
