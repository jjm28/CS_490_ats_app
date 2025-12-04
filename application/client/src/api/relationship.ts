// src/api/relationship.ts

import API_BASE from "../utils/apiBase";
import type { Contact } from "./contact";

// ---------------------------
// TYPE DEFINITIONS
// ---------------------------

export interface RelationshipAnalytics {
  total: number;
  byHealth: {
    excellent: number;
    good: number;
    needs_attention: number;
    at_risk: number;
  };
  byFrequency: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  averageRelationshipStrength: number;
  totalOpportunities: number;
  needingAttention: number;
}

export interface OutreachTemplate {
  subject: string;
  message: string;
}

export interface AllTemplates {
  general: OutreachTemplate;
  birthday: OutreachTemplate;
  congratulations: OutreachTemplate;
  job_opportunity: OutreachTemplate;
  value_add: OutreachTemplate;
}

// ---------------------------
// AUTH HEADER
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
// RELATIONSHIP MAINTENANCE API
// ---------------------------

export async function getContactsNeedingAttention(): Promise<Contact[]> {
  const res = await fetch(`${API_BASE}/api/networking/contacts/needing-attention`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch contacts needing attention");
  return res.json();
}

export async function getUpcomingReminders(): Promise<Contact[]> {
  const res = await fetch(`${API_BASE}/api/networking/reminders/upcoming`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch upcoming reminders");
  return res.json();
}

export async function updateContactHealth(contactId: string): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/update-health`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to update contact health");
  return res.json();
}

export async function updateAllContactsHealth(): Promise<{ success: boolean; updated: number }> {
  const res = await fetch(`${API_BASE}/api/networking/contacts/update-all-health`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to update all contacts health");
  return res.json();
}

export async function updateEngagementFrequency(
  contactId: string,
  frequency: string
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/engagement-frequency`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ frequency }),
    }
  );
  if (!res.ok) throw new Error("Failed to update engagement frequency");
  return res.json();
}

export async function getOutreachTemplate(
  contactId: string,
  context?: string
): Promise<OutreachTemplate> {
  const params = context ? `?context=${context}` : "";
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/templates${params}`,
    {
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch outreach template");
  return res.json();
}

export async function getAllOutreachTemplates(contactId: string): Promise<AllTemplates> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/templates/all`,
    {
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch all templates");
  return res.json();
}

export async function getRelationshipAnalytics(): Promise<RelationshipAnalytics> {
  const res = await fetch(`${API_BASE}/api/networking/analytics/relationships`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch relationship analytics");
  return res.json();
}

export async function markOpportunityGenerated(
  contactId: string,
  description?: string
): Promise<Contact> {
  const res = await fetch(
    `${API_BASE}/api/networking/contacts/${contactId}/opportunity`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ description }),
    }
  );
  if (!res.ok) throw new Error("Failed to mark opportunity");
  return res.json();
}

export async function getNetworkRelationshipSummary() {
  console.log("FETCHING:", `${API_BASE}/api/networking/analytics/relationships/summary`);
  const res = await fetch(
    `${API_BASE}/api/networking/analytics/relationships/summary`,
    {
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch network relationship summary");
  return res.json();
}