import type { Project } from "../components/Projects/Projects";

const API_URL = "http://localhost:5050/api/projects";

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// added in UC032
function buildQuery(params?: {
  search?: string;
  sort?: string;
  tech?: string;
  industry?: string;
}) {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.sort) q.set("sort", params.sort);
  if (params.tech) q.set("tech", params.tech);
  if (params.industry) q.set("industry", params.industry);
  const s = q.toString();
  return s ? `?${s}` : "";
}

// Changed UC032 added query search and changed url fetch to mtach parameters
export const getProjects = async (options?: {search?:string, sort?:string , tech?:string, industry?:string} ): Promise<Project[]> => {
  
  const query = buildQuery(options); // added in UC032

  const res = await fetch(API_URL + query, { headers: authHeaders() }); //changed in UC032
  if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`);
  return res.json();
};

export const addProjectApi = async (project: Project): Promise<Project> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`Failed to add project (${res.status})`);
  return res.json();
};

export const updateProjectApi = async (id: string, updatedFields: Partial<Project>) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updatedFields),
  });
  if (!res.ok) throw new Error(`Failed to update project (${res.status})`);
  return res.json();
};

export const deleteProjectApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to delete project (${res.status})`);
  return res.json();
};

// Added print friendly project summary in UC032
export const getProjectSummary = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch summary (${res.status})`);
  return res.json();
};