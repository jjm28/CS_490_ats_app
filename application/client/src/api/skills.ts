import type { Skill } from "../components/Skills/Skills"
//API functions
const API_URL = "http://localhost:5050/api/skills";

export const getSkills = async (): Promise<Skill[]> => {
  const res = await fetch(API_URL);
  return res.json();
};

export const addSkillApi = async (skill: Skill): Promise<Skill> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
  return res.json();
};

export const updateSkillApi = async (id: string, updatedFields: Partial<Skill>) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedFields),
  });
  return res.json();
};

export const deleteSkillApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return res.json();
};