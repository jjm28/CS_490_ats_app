const API = import.meta.env.VITE_API_URL;

export async function fetchCompanyInfo(company: string) {
  const res = await fetch(`${API}/api/company/info?company=${encodeURIComponent(company)}`);
  return res.json();
}
