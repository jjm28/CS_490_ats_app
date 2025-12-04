// src/api/linkedin.ts

import API_BASE from "../utils/apiBase";

// ---------------------------
// TYPE DEFINITIONS
// ---------------------------
export interface LinkedInProfile {
  linkedInId: string;
  linkedInProfileUrl?: string;
  headline?: string;
  photoUrl?: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface MessageTemplate {
  _id?: string;
  scenario: string;
  template: string;
  customized?: boolean;
}

export interface ConnectionRequestTemplate {
  _id?: string;
  scenario: string;
  template: string;
  tips?: string[];
}

export interface ProfileOptimizationSuggestion {
  category: 'headline' | 'summary' | 'experience' | 'skills' | 'other';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentStrategy {
  contentType: string;
  frequency: string;
  topics: string[];
  tips: string[];
}

export interface CampaignTemplate {
  name: string;
  description: string;
  targetAudience: string;
  timeline: string;
  steps: string[];
}

// ---------------------------
// AUTH HEADER
// ---------------------------
function authHeaders() {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ---------------------------
// LINKEDIN PROFILE
// ---------------------------
export async function getLinkedInProfile(): Promise<LinkedInProfile | null> {
  const res = await fetch(`${API_BASE}/api/linkedin/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch LinkedIn profile");
  }
  return res.json();
}

// ---------------------------
// MESSAGE TEMPLATES
// ---------------------------
export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const res = await fetch(`${API_BASE}/api/linkedin/templates/messages`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch message templates");
  return res.json();
}

export async function generateMessageTemplate(context: {
  scenario: string;
  recipientInfo?: string;
  userInfo?: string;
}): Promise<MessageTemplate> {
  const res = await fetch(`${API_BASE}/api/linkedin/templates/messages/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error("Failed to generate message template");
  return res.json();
}

// ---------------------------
// CONNECTION REQUEST TEMPLATES
// ---------------------------
export async function getConnectionTemplates(): Promise<ConnectionRequestTemplate[]> {
  const res = await fetch(`${API_BASE}/api/linkedin/templates/connections`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch connection templates");
  return res.json();
}

export async function generateConnectionTemplate(context: {
  scenario: string;
  recipientInfo?: string;
}): Promise<ConnectionRequestTemplate> {
  const res = await fetch(`${API_BASE}/api/linkedin/templates/connections/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error("Failed to generate connection template");
  return res.json();
}

// ---------------------------
// PROFILE OPTIMIZATION
// ---------------------------
export async function getProfileOptimization(): Promise<ProfileOptimizationSuggestion[]> {
  const res = await fetch(`${API_BASE}/api/linkedin/profile/optimize`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get profile optimization");
  return res.json();
}

// ---------------------------
// CONTENT STRATEGY
// ---------------------------
export async function getContentStrategy(): Promise<ContentStrategy> {
  const res = await fetch(`${API_BASE}/api/linkedin/content/strategy`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get content strategy");
  return res.json();
}

// ---------------------------
// CAMPAIGN TEMPLATES
// ---------------------------
export async function getCampaignTemplates(): Promise<CampaignTemplate[]> {
  const res = await fetch(`${API_BASE}/api/linkedin/campaigns/templates`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch campaign templates");
  return res.json();
}