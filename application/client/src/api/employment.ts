
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";


function getAuthToken(): string {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getDevUserId(): string {
  let id = localStorage.getItem("devUserId");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("devUserId", id);
  }
  return id;
}

function authHeaders() {
  const token = getAuthToken();
  const dev = getDevUserId();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-dev-user-id": dev,
  };
}
// ===== END added helpers =====

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

export async function listEmployment(): Promise<Employment[]> {
  const res = await fetch(`${API_BASE}/api/employment`, {
    credentials: "include",
    // ===== START send auth + dev on every request =====
    headers: {
      ...authHeaders(),
    },
    // ===== END send auth + dev on every request =====
  });
  return j<Employment[]>(res);
}

export async function getEmployment(id: string): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    credentials: "include",
    headers: {
      ...authHeaders(),
    },
  });
  return j<Employment>(res);
}

export async function createEmployment(
  body: Employment
): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(), // <== added
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return j<Employment>(res);
}

export async function updateEmployment(
  id: string,
  body: Partial<Employment>
): Promise<Employment> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(), // <== added
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return j<Employment>(res);
}

export async function deleteEmployment(id: string): Promise<true> {
  const res = await fetch(`${API_BASE}/api/employment/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      ...authHeaders(), 
    },
  });
  if (!res.ok) {
    let msg = `Delete failed (${res.status})`;
    try {
      const j = await res.json();
      msg = (j as any)?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return true;
}
