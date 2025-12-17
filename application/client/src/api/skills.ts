import type { Skill } from "../components/Skills/Skills";
import API_BASE from "../utils/apiBase";

const API_URL = `${API_BASE}/api/skills`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getSkills = async (): Promise<Skill[]> => {
  const res = await fetch(API_URL, {
    headers: authHeader(),
  });
  return res.json();
};

export const addSkillApi = async (skill: Skill): Promise<Skill> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(skill),
  });
  return res.json();
};

export const updateSkillApi = async (
  id: string,
  updatedFields: Partial<Skill>
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

export const deleteSkillApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  return res.json();
};