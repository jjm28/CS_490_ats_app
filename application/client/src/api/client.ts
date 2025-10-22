// client/src/api/client.ts
// Tiny fetch wrapper for JSON APIs

const BASE = import.meta.env.VITE_API_BASE_URL as string;


export function setDevUserId(id: string) {
  localStorage.setItem('devUserId', id);
}
export function getDevUserId(): string {
  return localStorage.getItem('devUserId') || 'user-1';
}


export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const devUserId = getDevUserId();

  const res = await fetch(`${BASE}${path}`, {
    // default JSON headers + dev user header
    headers: {
      'Content-Type': 'application/json',
      'x-dev-user-id': devUserId, // server middleware reads this
      ...(init?.headers || {}),
    },
    // if you later use cookies/sessions, re-enable:
    // credentials: 'include',
    ...init,
  });

  // Try to parse JSON (handle 204/empty)
  let data: any = undefined;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = (data && typeof data === 'object') ? data : { status: res.status, code: res.statusText, body: data };
    throw err;
  }

  return data as T;
}
