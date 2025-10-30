import type { Project } from "../components/Projects/Projects";

const API_URL = "http://localhost:5050/api/projects";

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const getProjects = async (): Promise<Project[]> => {
  const res = await fetch(API_URL, { headers: authHeaders() });
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