// application/client/src/api/employment.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export type Employment = {
  _id?: string;
  userId?: string;

  jobTitle: string;
  company: string;
  location?: string;

  startDate: string;
  endDate?: string | null;
  currentPosition: boolean;

  description?: string;
};



async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = (data as any)?.error || (data as any)?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

function authHeaders() {
  const token =
    localStorage.getItem('authToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listEmployment(): Promise<Employment[]> {
  const res = await fetch(`${API_BASE}/api/employment`, { credentials: 'include' });
  return j<Employment[]>(res);
}

export async function getEmployment(id: string): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, { credentials: 'include' });
  return j<Employment>(res);
}

export async function createEmployment(body: Employment): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return j<Employment>(res);
}

export async function updateEmployment(id: string, body: Partial<Employment>): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return j<Employment>(res);
}

/*export async function removeEmployment(id: string): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return j<{ ok: true }>(res);
}*/

export async function deleteEmployment(id: string): Promise<true> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type' : 'application/json'},
    credentials: 'include',
    
  });
  if (!res.ok) {
    let msg = `Delete failed (${res.status})`;
    try { const j = await res.json(); msg = (j as any)?.error || msg; } catch {}
    throw new Error(msg);
  }
  return true;
}