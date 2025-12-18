export type UC125Settings = {
  apiBase: string;           // backend base, e.g. http://localhost:5050
  appBase?: string;          // optional app base, e.g. http://localhost:5173
  enabled: boolean;

  // local testing only (keep for dev)
  devUserId?: string;

  // production pairing token (Bearer token)
  authToken?: string;
  pairedUserId?: string;
  pairedAt?: string;

  lastStatusMessage?: string;
};

const DEFAULTS: UC125Settings = {
  apiBase: "http://localhost:5050",
  appBase: "http://localhost:5173",
  enabled: false,
};

const KEY = "uc125_settings";

function storageGet<T>(keys: string[]): Promise<Record<string, T>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items: any) => resolve(items as Record<string, T>));
  });
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(items, () => resolve()));
}

export async function getSettings(): Promise<UC125Settings> {
  const got = await storageGet<UC125Settings>([KEY]);
  const s = got[KEY];
  return {
    ...DEFAULTS,
    ...(s || {}),
    apiBase: (s?.apiBase || DEFAULTS.apiBase).replace(/\/+$/, ""),
    appBase: (s?.appBase || DEFAULTS.appBase || "").replace(/\/+$/, ""),
    enabled: Boolean(s?.enabled),
  };
}

export async function saveSettings(patch: Partial<UC125Settings>): Promise<UC125Settings> {
  const cur = await getSettings();
  const next: UC125Settings = {
    ...cur,
    ...patch,
    apiBase: (patch.apiBase ?? cur.apiBase).replace(/\/+$/, ""),
    appBase: (patch.appBase ?? cur.appBase ?? "").replace(/\/+$/, ""),
    enabled: patch.enabled ?? cur.enabled,
  };
  await storageSet({ [KEY]: next });
  return next;
}

export async function setEnabled(enabled: boolean): Promise<UC125Settings> {
  return saveSettings({ enabled });
}

export async function setLastStatusMessage(msg: string): Promise<UC125Settings> {
  return saveSettings({ lastStatusMessage: msg });
}

export async function setAuthToken(token: string, pairedUserId?: string): Promise<UC125Settings> {
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  return saveSettings({
    authToken: clean,
    pairedUserId: pairedUserId || undefined,
    pairedAt: new Date().toISOString(),
    // once paired, devUserId should not be used
    devUserId: undefined,
  });
}

export async function clearAuth(): Promise<UC125Settings> {
  return saveSettings({
    authToken: undefined,
    pairedUserId: undefined,
    pairedAt: undefined,
  });
}