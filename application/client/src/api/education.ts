import type { Education } from "../components/Education/Education";
import API_BASE from "../utils/apiBase";

const API_URL = `${API_BASE}/api/education`;

// Always return a record (never a union) so TypeScript is happy
function authHeader(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getEducation = async (): Promise<Education[]> => {
  const res = await fetch(API_URL, {
    headers: authHeader(),
  });
  return res.json();
};

export const addEducationApi = async (education: Education): Promise<Education> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(education),
  });
  return res.json();
};

export const updateEducationApi = async (
  id: string,
  updatedFields: Partial<Education>
) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(updatedFields),
  });
  return res.json();
};

export const deleteEducationApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  return res.json();
};