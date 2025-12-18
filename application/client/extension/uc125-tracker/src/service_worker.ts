// CS_490_ats_app/application/client/extension/uc125-tracker/src/service_worker.ts

import { getSettings } from "./shared/storage";

type ImportOk = {
  ok: true;
  deduped?: boolean;
  createdJob?: boolean;
  mergedIntoExistingJob?: boolean;
  jobId?: string;
  schedule?: { created: boolean; scheduleId?: string };
  eventId?: string;
  jobMatchVia?: string;
};

type ImportErr = { ok: false; error: string };

function stripTrailingSlash(u: string) {
  return (u || "").replace(/\/+$/, "");
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg:any, _sender:any, sendResponse:any) => {
  if (msg?.type !== "UC125_IMPORT") return;

  (async () => {
    const settings = await getSettings();
    const apiBase = stripTrailingSlash(settings.apiBase || "http://localhost:5050");

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Auth path: token preferred; dev header fallback for local testing
    if (settings.authToken) {
      headers.Authorization = `Bearer ${settings.authToken}`;
    } else if ((settings as any).devUserId) {
      headers["x-dev-user-id"] = String((settings as any).devUserId);
    }

    const res = await fetch(`${apiBase}/api/application-import/extension`, {
      method: "POST",
      headers,
      body: JSON.stringify(msg.payload),
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (!res.ok) {
      const errorMsg =
        json?.error || json?.message || `Request failed (${res.status})`;
      sendResponse({ ok: false, error: errorMsg } satisfies ImportErr);
      return;
    }

    sendResponse({ ok: true, ...(json || {}) } satisfies ImportOk);
  })().catch((e: any) => {
    sendResponse({ ok: false, error: e?.message || "Import failed." } satisfies ImportErr);
  });

  return true; // keep the message channel open for async sendResponse
});
