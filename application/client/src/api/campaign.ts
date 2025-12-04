// src/api/campaign.ts

import API_BASE from "../utils/apiBase";

// ---------------------------
// TYPE DEFINITIONS
// ---------------------------

export interface CampaignGoals {
  outreachCount: number;
  responseTarget: number;
  timeline: string;
}

export interface CampaignMetrics {
  totalOutreach: number;
  sent: number;
  responses: number;
  responseRate: number;
}

export interface ABTestVariant {
  variantName: string;
  description: string;
  outreachIds: string[];
  sent: number;
  responses: number;
  successRate: number;
}

export interface Outreach {
  outreachId: string;
  contactId: string;
  contactName: string;
  status: 'pending' | 'sent' | 'responded' | 'no-response';
  approach: string;
  variantUsed?: string;
  sentDate?: string;
  responseDate?: string;
  notes?: string;
}

export interface Campaign {
  _id: string;
  userid: string;
  name: string;
  description?: string;
  targetIndustry?: string;
  targetCompanies: string[];
  goals: CampaignGoals;
  status: 'active' | 'paused' | 'completed';
  outreaches: Outreach[];
  metrics: CampaignMetrics;
  strategyNotes?: string;
  abTestVariants: ABTestVariant[];
  linkedJobs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalOutreaches: number;
  totalResponses: number;
  overallResponseRate: number;
  campaignBreakdown: {
    name: string;
    status: string;
    metrics: CampaignMetrics;
    goalProgress: {
      outreachProgress: number;
      responseProgress: number;
    };
  }[];
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
// CAMPAIGN CRUD
// ---------------------------

export async function getCampaigns(status?: string): Promise<Campaign[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`${API_BASE}/api/networking/campaigns${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

export async function getCampaign(id: string): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/api/networking/campaigns/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch campaign");
  return res.json();
}

export async function createCampaign(
  data: Partial<Campaign>
): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/api/networking/campaigns`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  return res.json();
}

export async function updateCampaign(
  id: string,
  data: Partial<Campaign>
): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/api/networking/campaigns/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update campaign");
  return res.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/networking/campaigns/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete campaign");
}

// ---------------------------
// CAMPAIGN OUTREACHES
// ---------------------------

export async function addOutreach(
  campaignId: string,
  outreach: Partial<Outreach>
): Promise<Campaign> {
  const res = await fetch(
    `${API_BASE}/api/networking/campaigns/${campaignId}/outreaches`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(outreach),
    }
  );
  if (!res.ok) throw new Error("Failed to add outreach");
  return res.json();
}

export async function updateOutreach(
  campaignId: string,
  outreachId: string,
  data: Partial<Outreach>
): Promise<Campaign> {
  const res = await fetch(
    `${API_BASE}/api/networking/campaigns/${campaignId}/outreaches/${outreachId}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to update outreach");
  return res.json();
}

export async function deleteOutreach(
  campaignId: string,
  outreachId: string
): Promise<Campaign> {
  const res = await fetch(
    `${API_BASE}/api/networking/campaigns/${campaignId}/outreaches/${outreachId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to delete outreach");
  return res.json();
}

// ---------------------------
// ANALYTICS
// ---------------------------

export async function getCampaignAnalytics(): Promise<CampaignAnalytics> {
  const res = await fetch(`${API_BASE}/api/networking/campaigns-analytics`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}