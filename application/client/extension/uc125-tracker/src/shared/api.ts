import { getSettings } from "./storage";

export type PairCompleteResponse =
  | { ok: true; token: string; userId?: string }
  | { ok: false; error: string };

export type ImportFromExtensionPayload = {
  platform: "linkedin" | "indeed" | "glassdoor";
  jobTitle: string;
  company: string;
  location?: string;
  jobUrl: string;
  appliedAt: string;
  timezone: string;
  messageId: string;
  detectedVia?: string;
  pageTitle?: string;
};

export type ImportFromExtensionResponse =
  | {
      ok: true;
      deduped: boolean;
      createdJob?: boolean;
      mergedIntoExistingJob?: boolean;
      jobId?: string;
      schedule?: { created: boolean; scheduleId?: string };
      eventId?: string;
      jobMatchVia?: string;
    }
  | { ok: false; error: string };

function join(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return (json ?? {}) as T;
}

function parsePairingInput(inputRaw: string): { pairingId?: string; code?: string; token?: string } {
  const raw = (inputRaw || "").trim();

  // Accept direct JWT (or "Bearer ...")
  const bearerMatch = raw.match(/^Bearer\s+(.+)$/i);
  const maybeJwt = bearerMatch ? bearerMatch[1].trim() : raw;
  if (maybeJwt.split(".").length === 3 && maybeJwt.length > 40) {
    return { token: maybeJwt };
  }

  // Accept JSON: {"pairingId":"...","code":"123456"}
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const obj = JSON.parse(raw);
      if (obj?.pairingId && obj?.code) return { pairingId: String(obj.pairingId), code: String(obj.code) };
      if (obj?.code) return { code: String(obj.code) };
    } catch {
      // ignore
    }
  }

  // Accept "pairingId|code" or "pairingId:code"
  const m = raw.match(/^([a-f0-9]{16,64})\s*[:|]\s*([0-9]{6})$/i);
  if (m) return { pairingId: m[1], code: m[2] };

  // Accept just 6-digit code (ONLY works if backend supports code-only; yours does not)
  const c = raw.match(/^([0-9]{6})$/);
  if (c) return { code: c[1] };

  return {};
}

function mapPairingError(e: string) {
  if (e === "pairing_not_found") {
    return "pairing_not_found — Your backend requires pairingId + code. Paste the FULL value: pairingId|code (not only the 6-digit code).";
  }
  if (e === "invalid_code") return "invalid_code — The code is wrong. Generate a new pairing and try again.";
  if (e === "expired") return "expired — The pairing expired. Generate a new one.";
  if (e === "already_paired") return "already_paired — This pairing was already used. Generate a new one.";
  return e;
}

export async function completePairing(pairingInput: string): Promise<PairCompleteResponse> {
  const settings = await getSettings();
  const apiBase = settings.apiBase;

  const parsed = parsePairingInput(pairingInput);

  if (parsed.token) return { ok: true, token: parsed.token };

  if (!parsed.code) {
    return { ok: false, error: "Paste pairingId|code from the Scheduler page (example: abcd1234...|150248)" };
  }

  // IMPORTANT: your backend effectively needs pairingId too
  const body: any = { code: parsed.code };
  if (parsed.pairingId) body.pairingId = parsed.pairingId;

  try {
    const out = await requestJson<any>(join(apiBase, "/api/application-import/pair/complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const token = out?.token;
    if (!token) return { ok: false, error: "Pairing succeeded but backend returned no token." };
    return { ok: true, token: String(token), userId: out?.userId ? String(out.userId) : undefined };
  } catch (e: any) {
    return { ok: false, error: mapPairingError(e?.message || "Failed to complete pairing.") };
  }
}

export async function importFromExtension(payload: ImportFromExtensionPayload): Promise<ImportFromExtensionResponse> {
  const settings = await getSettings();
  const apiBase = settings.apiBase;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (settings.authToken) {
    headers.Authorization = `Bearer ${settings.authToken}`;
  } else if (settings.devUserId) {
    headers["x-dev-user-id"] = settings.devUserId;
  }

  try {
    const out = await requestJson<any>(join(apiBase, "/api/application-import/extension"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return { ok: true, ...(out || {}) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Import failed." };
  }
}
