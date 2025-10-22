// Helper for making API calls from the client
const BASE = import.meta.env.VITE_API_BASE_URL as string;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw await res.json().catch(() => ({ error: { code: res.status } }));
  return (await res.json()) as T;
}