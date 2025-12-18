import API_BASE from "../utils/apiBase";

const DEV_USER_ID = "064cfccd-55e0-4226-be75-ba9143952fc4";

function baseHeaders() {
  return {
    "Content-Type": "application/json",
    "x-dev-user-id": DEV_USER_ID,
  };
}

export async function getIndustries() {
  const res = await fetch(`${API_BASE}/api/market/industries`, {
    headers: baseHeaders(),
  });
  return res.json();
}

export async function getSkillsForIndustry(industry: string) {
  const res = await fetch(
    `${API_BASE}/api/market/skills?industry=${encodeURIComponent(industry)}`,
    { headers: baseHeaders() }
  );
  return res.json();
}

export async function getUserSkills() {
  const res = await fetch(`${API_BASE}/api/skills`, {
    headers: baseHeaders(),
  });

  if (!res.ok) {
    console.warn("⚠️ Could not load user skills:", res.status);
    return []; // prevents crash
  }

  const data = await res.json();

  if (!Array.isArray(data)) return [];

  return data
    .map((s: any) => s.name)
    .filter(Boolean)
    .map((name: string) => name.toLowerCase());
}

export async function getTopCompanies(industry: string) {
  const res = await fetch(
    `${API_BASE}/api/market/companies?industry=${encodeURIComponent(industry)}`,
    { headers: baseHeaders() }
  );
  return res.json();
}

export async function getIndustryTrends() {
  const res = await fetch(`${API_BASE}/api/market/industry-trends`, {
    headers: baseHeaders(),
  });
  return res.json();
}

export async function getEmergingSkills() {
  const res = await fetch(`${API_BASE}/api/market/emerging-skills`, {
    headers: baseHeaders(),
  });
  return res.json();
}

export async function getJobCount() {
  const res = await fetch(`${API_BASE}/api/market/job-count`, {
    headers: baseHeaders(),
  });
  return res.json();
}

export async function getSkillsForJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/market/job/${jobId}/skills`, {
    headers: baseHeaders(), // ✅ THIS WAS MISSING
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job skills");
  }

  return res.json();
}

export async function getUserSkillsWithLevels() {
  const res = await fetch(`${API_BASE}/api/skills`, {
    headers: baseHeaders(),
  });

  if (!res.ok) return [];

  const data = await res.json();

  return data.map((s: any) => ({
    name: s.name.toLowerCase(),
    proficiency: s.proficiency, // ✅ CORRECT FIELD
  }));
}

export async function getEducationForJob(jobId: string) {
  const res = await fetch(
    `${API_BASE}/api/market/job/${jobId}/education`,
    { headers: baseHeaders() }
  );

  if (!res.ok) {
    return { level: null, fields: [] };
  }

  const text = await res.text();
  if (!text) {
    return { level: null, fields: [] };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { level: null, fields: [] };
  }
}

export async function getUserEducation() {
  const res = await fetch(`${API_BASE}/api/education`, {
    headers: baseHeaders(),
  });

  if (!res.ok) return [];
  return res.json();
}

export async function getUserEducationForMatch() {
  const res = await fetch(`${API_BASE}/api/market/user/education`, {
    headers: baseHeaders(),
  });

  if (!res.ok) return [];
  return res.json();
}