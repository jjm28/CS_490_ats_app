// src/api/profiles.ts
import { v4 as uuidv4 } from "uuid";
import API_BASE from "../utils/apiBase";
import { handleError } from "../utils/errorHandler";

function getDevUserId(): string {
  // Keep one per browser (matches your dev middleware behavior)
  let id = localStorage.getItem("devUserId");
  if (!id) {
    // namespace with something stable if you want: e.g., "keegan-laptop"
    const ns = localStorage.getItem("devUserNs") || "dev";
    id = `${ns}-${uuidv4().slice(0, 8)}`;
    localStorage.setItem("devUserId", id);
  }
  return id;
}

function authHeaders() {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-dev-user-id": getDevUserId(), // dev-only header so backend attaches user
  };
}

// ----- Types -----
export type Location = { city?: string; state?: string };
export type Profile = {
  _id?: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  bio: string;
  industry: string;
  experienceLevel: string;
  location: Location;
  createdAt?: string;
  updatedAt?: string;
  photoUrl?: string;
};

const BASE = API_BASE || ""; // empty = same-origin during prod behind reverse proxy
const EP = "/api/profile";

// ----- API calls -----
export async function listProfiles(): Promise<Profile[]> {
  const res = await fetch(BASE + EP, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`List failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getProfile(id: string): Promise<Profile> {
  const res = await fetch(`${BASE + EP}/${id}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 404) throw new Error("Profile not found");
  if (!res.ok) throw new Error(`Get failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function createProfile(body: Profile): Promise<Profile> {
  const res = await fetch(BASE + EP, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText;
    handleError(res, msg);
    throw new Error(`Create failed: ${msg}`);
  }
  return data;
}

export async function updateProfile(id: string, body: Partial<Profile>): Promise<Profile> {
  const res = await fetch(`${BASE + EP}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText;
    handleError(res, msg);
    throw new Error(`Update failed: ${msg}`);
  }
  return data;
}
