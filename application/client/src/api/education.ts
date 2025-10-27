import type { Education } from "../components/Education/Education";

const API_URL = "http://localhost:5050/api/education";

export const getEducation = async (): Promise<Education[]> => {
  const res = await fetch(API_URL);
  return res.json();
};

export const addEducationApi = async (education: Education): Promise<Education> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(education),
  });
  return res.json();
};

export const updateEducationApi = async (id: string, updatedFields: Partial<Education>) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedFields),
  });
  return res.json();
};

export const deleteEducationApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return res.json();
};