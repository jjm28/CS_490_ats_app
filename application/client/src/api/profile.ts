import { api } from './client';
import type { Profile } from '../constants/profile';

// GET /api/users/me → Profile | null (null = no profile yet)
export async function getMe(): Promise<Profile | null> {
  try {
    const res = await api<{ ok: true; data: Profile }>('/api/users/me');
    return res.data;
  } catch (err: any) {
    const code = err?.error?.code ?? err?.code ?? err?.status;
    if (code === 'NOT_FOUND' || code === 404) return null; // first-time users
    throw err; 
  }
}

// PUT /api/users/me → Profile (create or update)
export async function updateMe(profile: Profile): Promise<Profile> {
  const res = await api<{ ok: true; data: Profile }>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return res.data;
}