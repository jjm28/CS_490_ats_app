// src/api/contact.ts

import API_BASE from "../utils/apiBase";

// ---------------------------
// TYPE DEFINITIONS
// ---------------------------
export interface Interaction {
  _id: string;
  type: string;
  note: string;
  date: string;
}

export interface Contact {
  _id: string;
  userid: string;

  name: string;
  jobTitle?: string;
  company?: string;
  email?: string;
  phone?: string;

  industry?: string;
  relationshipType?: string;
  tags: string[];

  relationshipStrength: number;

  lastInteraction: string | null;
  interactions: Interaction[];

  personalNotes?: string;
  professionalNotes?: string;

  linkedJobs: string[];

  reminderDate: string | null;

  aiSummary?: string;
  aiNextSteps?: string;
  aiInterests?: string;

  // ✨ NEW FIELDS FOR UC-093
  relationshipHealth?: 'excellent' | 'good' | 'needs_attention' | 'at_risk';
  engagementFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  daysSinceLastContact?: number;
  totalOutreachCount?: number;
  reciprocityScore?: number;
  opportunitiesGenerated?: number;
  nextSuggestedContact?: string;
  lastReminderSent?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SentimentResponse {
  score: number;
  summary: string;
}

// ---------------------------
// AUTH HEADER (FIXED)
// ---------------------------
function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ---------------------------
// CONTACT CRUD
// ---------------------------
export async function getContacts(): Promise<Contact[]> {
  const res = await fetch(`${API_BASE}/api/networking/contacts`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}

export async function getContact(id: string): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch contact");
  return res.json();
}

export async function createContact(
  data: Partial<Contact>
): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/networking/contacts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
}

export async function updateContact(
  id: string,
  data: Partial<Contact>
): Promise<Contact> {
  const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update contact");
  return res.json();
}

export async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete contact");
}

// ---------------------------
// INTERACTIONS
// ---------------------------
export async function addInteraction(
  contactId: string,
  interaction: { type: string; note: string }
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/interactions/${contactId}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(interaction),
    }
  );
  if (!res.ok) throw new Error("Failed to add interaction");
  return res.json();
}

// ---------------------------
// REMINDERS
// ---------------------------
export async function setReminder(
  contactId: string,
  date: string
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/reminders/${contactId}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date }),
    }
  );
  if (!res.ok) throw new Error("Failed to set reminder");
  return res.json();
}

// ---------------------------
// AI ACTIONS
// ---------------------------
export async function generateAiInsights(
  contactId: string
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/ai/insights`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("AI insights failed");
  return res.json();
}

export async function refreshRelationshipStrength(
  contactId: string
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/ai/strength`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to refresh strength");
  return res.json();
}
