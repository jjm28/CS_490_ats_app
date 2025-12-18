import { getSettings } from "./storage";

export type PairStartResponse =
  | { ok: true; pairingId: string; code: string; expiresAt: string }
  | { ok: false; error: string };

export type PairCompleteResponse =
  | { ok: true; token: string; userId: string }
  | { ok: false; error: string };

function stripTrailingSlash(u: string) {
  return (u || "").replace(/\/+$/, "");
}

async function getBaseUrl() {
  const s = await getSettings();
  return stripTrailingSlash(s.apiBase || "http://localhost:5050");
}

export async function pairStart(): Promise<PairStartResponse> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/application-import/pair/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName: "Ontrac UC-125 Tracker" }),
  });
  return res.json();
}

/**
 * Accepts either:
 *  - code only: "570531"
 *  - or "pairingId|570531"
 */
export async function pairComplete(codeOrPairingPipeCode: string): Promise<PairCompleteResponse> {
  const base = await getBaseUrl();
  const raw = (codeOrPairingPipeCode || "").trim();

  let pairingId: string | undefined;
  let code: string | undefined;

  if (raw.includes("|")) {
    const [pid, c] = raw.split("|").map((x) => x.trim());
    pairingId = pid || undefined;
    code = c || undefined;
  } else {
    code = raw;
  }

  const body: any = { code };
  if (pairingId) body.pairingId = pairingId;

  const res = await fetch(`${base}/api/application-import/pair/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}
