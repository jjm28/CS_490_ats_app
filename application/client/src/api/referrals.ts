import axios from "axios";
import API_BASE from "../utils/apiBase";
import type { ReferralStatus } from "../components/Referral/ReferralStatusBadge";

// -------------------------
// TYPES
// -------------------------
export interface Referral {
  _id: string;
  referrerName: string;
  status: ReferralStatus;

  jobId?: {
    jobTitle: string;
  };

  dateRequested: string;
  nextFollowUp?: string | null;

  // NEW — Relationship score (AI or manual)
  relationshipStrength?: number;

  // NEW — Success probability estimate (AI)
  successRate?: number;
}

export interface TimelineLog {
  _id: string;
  eventType: string;
  createdAt: string;
  eventDetails: string;
}

// -------------------------
// CORE REFERRAL ACTIONS
// -------------------------

export const createReferralRequest = (data: any) =>
  axios.post(`${API_BASE}/api/referrals/request`, data);

export const getReferralList = (userId: string) =>
  axios.get(`${API_BASE}/api/referrals/list?userId=${userId}`);

export const updateReferralStatus = (id: string, status: string, outcome: string) =>
  axios.patch(`${API_BASE}/api/referrals/status/${id}`, { status, outcome });

export const addFollowUp = (id: string, data: any) =>
  axios.post(`${API_BASE}/api/referrals/followup/${id}`, data);

export const addGratitude = (id: string, data: any) =>
  axios.post(`${API_BASE}/api/referrals/gratitude/${id}`, data);

export const getReferralTimeline = (id: string) =>
  axios.get(`${API_BASE}/api/referrals/timeline/${id}`);


// -------------------------
// AI FEATURE ENDPOINTS
// (MATCHING YOUR BACKEND EXACTLY)
// -------------------------

// AI: Referral template generator
export const generateReferralTemplate = (data: any) =>
  axios.post(`${API_BASE}/api/referrals/ai/template`, data);

// AI: Etiquette tips
export const getEtiquetteGuidance = () =>
  axios.post(`${API_BASE}/api/referrals/ai/etiquette`, {});

// AI: Timing suggestions
export function getTimingSuggestions(data: { jobTitle: string }) {
  return axios.post(`${API_BASE}/api/referrals/ai/timing`, data);
}

// AI: Personalization tips
export const getPersonalizationTips = (data: {
  jobTitle: string;
  relationship: string;
}) =>
  axios.post(`${API_BASE}/api/referrals/ai/personalization`, data);

// AI: Referral Source Finder
export const getReferralSources = (data: {
  userId: string;
  targetCompany: string;
  jobTitle: string;
}) =>
  axios.post(`${API_BASE}/api/referrals/sources/recommend`, data);

