export async function getCompanyInfo(query: string) {
  const res = await fetch(`/api/company/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to fetch company info");
  return res.json();
}