import axios from "axios";
import API_BASE from "../utils/apiBase";

function authHeaders() {
  const token = localStorage.getItem("token");
  
  // Dev mode fallback: use x-dev-user-id if available
  const devUserId = localStorage.getItem("x-dev-user-id") || 
                    sessionStorage.getItem("x-dev-user-id");
  
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
  };
}

export async function getAutomationRules() {
  const res = await axios.get(`${API_BASE}/api/automation`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getAutomationRuleById(id: string) {
  const res = await axios.get(`${API_BASE}/api/automation/${id}`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function createAutomationRule(data: any) {
  const res = await axios.post(`${API_BASE}/api/automation`, data, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function updateAutomationRule(id: string, data: any) {
  const res = await axios.put(`${API_BASE}/api/automation/${id}`, data, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function deleteAutomationRule(id: string) {
  const res = await axios.delete(`${API_BASE}/api/automation/${id}`, {
    headers: authHeaders(),
  });
  return res.data;
}