const API_URL = "http://localhost:5050/api/company";

export const getCompanyInfo = async (name: string) => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Company not found");
  return res.json();
};