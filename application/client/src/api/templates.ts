import API_BASE from "../utils/apiBase";
import type { TemplateKey } from "./resumes";

const API =
  `${API_BASE}/api`;

function getAuthHeaders() {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  const token = (u?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

export async function listResumeTemplates({ userid }: { userid: string }) {
  const r = await fetch(`${API}/resume-templates?userid=${encodeURIComponent(userid)}`, {
    headers: getAuthHeaders(),
  });
  if (!r.ok) throw new Error("Failed to fetch templates");
  return r.json();
}

export async function getDefaultResumeTemplate({ userid }: { userid: string }) {
  const r = await fetch(`${API}/resume-templates/default?userid=${encodeURIComponent(userid)}`, {
    headers: getAuthHeaders(),
  });
  if (r.status === 204) return { templateKey: null };
  if (!r.ok) throw new Error("Failed to fetch default");
  return r.json();
}

export async function setDefaultResumeTemplate({ userid, templateKey }: { userid: string; templateKey: TemplateKey }) {
  const r = await fetch(`${API}/resume-templates/default`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userid, templateKey }),
  });
  if (!r.ok) throw new Error("Failed to set default");
  return r.json();
}
