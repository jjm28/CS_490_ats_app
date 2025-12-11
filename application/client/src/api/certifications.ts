import type { Certification } from "../components/Certifications/Certifications";
import API_BASE from "../utils/apiBase";

const API_URL = "http://localhost:5050/api/certifications";

// Helper to include Authorization header if token exists
const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const getCertifications = async (): Promise<Certification[]> => {
  const res = await fetch(API_URL, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch certifications (${res.status})`);
  return res.json();
};

export const addCertificationApi = async (cert: Certification): Promise<Certification> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(cert),
  });
  if (!res.ok) throw new Error(`Failed to add certification (${res.status})`);
  return res.json();
};

export const updateCertificationApi = async (
  id: string,
  updatedFields: Partial<Certification>
): Promise<Certification> => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updatedFields),
  });
  if (!res.ok) throw new Error(`Failed to update certification (${res.status})`);
  return res.json();
};

export const deleteCertificationApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete certification (${res.status})`);
  return res.json();
};

// api/certifications.ts

export async function uploadCertificationBadge(
  id: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("badge", file);

  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/certifications/${id}/badge`, {
    method: "POST",
    body: formData,
    headers: {
      // DO NOT set Content-Type manually for FormData
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to upload badge image");
  }

  const data = await res.json();
  // we stored relative in badgeImageUrl
  return data.badgeImageUrl as string;
}
