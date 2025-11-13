import axios from "axios";
import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-dev-user-id": DEV_USER_ID, // dev mode override
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