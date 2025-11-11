export type TemplateKey = "chronological" | "functional" | "hybrid";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""; // e.g., http://localhost:5050
const json = (extra?: Record<string, string>) => ({
  "Content-Type": "application/json",
  ...(extra ?? {}),
});

async function handle(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message || body?.error || msg;
      throw Object.assign(new Error(msg), { status: res.status, details: body });
    } catch {
      throw new Error(msg);
    }
  }
  return res.status === 204 ? null : res.json();
}

/** === Default Template === */
export async function getDefaultResumeTemplate(params: {
  userid: string;
  token?: string;
}): Promise<{ templateKey: TemplateKey | null }> {
  const url = new URL(`${API_BASE}/api/resume-templates/default`);
  url.searchParams.set("userid", params.userid);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: params.token ? json({ Authorization: `Bearer ${params.token}` }) : json(),
  });
  return handle(res);
}

export async function setDefaultResumeTemplate(input: {
  userid: string;
  templateKey: TemplateKey;
  token?: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/api/resume-templates/default`, {
    method: "POST",
    headers: input.token ? json({ Authorization: `Bearer ${input.token}` }) : json(),
    body: JSON.stringify({ userid: input.userid, templateKey: input.templateKey }),
  });
  return handle(res);
}

export async function createResumeTemplate(input: {
  userid: string;
  title: string;
  templateKey: TemplateKey;
  style?: any;
  token?: string;
}): Promise<{ templateId: string }> {
  const res = await fetch(`${API_BASE}/api/resume-templates`, {
    method: "POST",
    headers: input.token ? json({ Authorization: `Bearer ${input.token}` }) : json(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function listResumeTemplates(params: {
  userid: string;
  token?: string;
}): Promise<Array<{ _id: string; title: string; templateKey: TemplateKey; owner: string; style?: any }>> {
  const url = new URL(`${API_BASE}/api/resume-templates`);
  url.searchParams.set("userid", params.userid);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: params.token ? json({ Authorization: `Bearer ${params.token}` }) : json(),
  });
  return handle(res);
}

export async function shareResumeTemplate(input: {
  templateId: string;
  visibility: "private" | "team" | "org";
  token?: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/api/resume-templates/${input.templateId}/share`, {
    method: "POST",
    headers: input.token ? json({ Authorization: `Bearer ${input.token}` }) : json(),
    body: JSON.stringify({ visibility: input.visibility }),
  });
  return handle(res);
}
