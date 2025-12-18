// CS_490_ats_app/application/client/extension/uc125-tracker/src/content/contentScript.ts

import { getSettings, setEnabled, setLastStatusMessage } from "../shared/storage";
import { ensureTopBar, removeTopBar, showToast } from "../ui/injectedBar";

import * as LI from "./platforms/linkedin";
import * as IN from "./platforms/indeed";
import * as GD from "./platforms/glassdoor";

type SupportedPlatform = "linkedin" | "indeed" | "glassdoor";

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

type ImportResponse = ImportOk | ImportErr;

function platform(): SupportedPlatform | null {
  if (LI.isLinkedIn()) return "linkedin";
  if (IN.isIndeed()) return "indeed";
  if (GD.isGlassdoor()) return "glassdoor";
  return null;
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function getPageTextSample(): string {
  return (document.body?.innerText || "").slice(0, 30000);
}

function extract(p: SupportedPlatform): { jobTitle: string; company: string; location: string } {
  if (p === "linkedin") return LI.extractDetails();
  if (p === "indeed") return IN.extractDetails();
  return GD.extractDetails();
}

function appliedSignal(p: SupportedPlatform, text: string): boolean {
  if (p === "linkedin") return LI.looksLikeApplied(text);
  if (p === "indeed") return IN.looksLikeApplied(text);
  return GD.looksLikeApplied(text);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * IMPORTANT: Avoid CORS by sending the import request to the MV3 service worker.
 * The service worker performs the fetch to localhost (host_permissions), not LinkedIn.
 */
async function importViaBackground(payload: any): Promise<ImportResponse> {
  return await new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "UC125_IMPORT", payload }, (resp: any) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: err.message || "Background message failed." });
          return;
        }
        resolve((resp as ImportResponse) || { ok: false, error: "No response from background." });
      });
    } catch (e: any) {
      resolve({ ok: false, error: e?.message || "Failed to send message to background." });
    }
  });
}

let observer: MutationObserver | null = null;
let lastSendKey: string | null = null;

async function extractWithRetry(p: SupportedPlatform) {
  let last = { jobTitle: "", company: "", location: "" };
  for (let i = 0; i < 6; i++) {
    last = extract(p);
    if (last.jobTitle && last.company) return last;
    await sleep(250);
  }
  return last;
}

async function handleDetectedApply(p: SupportedPlatform) {
  // Keep the top bar alive on LinkedIn SPA navigations
  ensureTopBar();

  const details = await extractWithRetry(p);
  const jobUrl = location.href;
  const pageTitle = document.title || "";

  if (!details.jobTitle || !details.company) {
    const msg =
      "Ontrac Tracker: could not extract job title/company from this page. " +
      "Tip: open the job details pane (right side) before hitting Done. " +
      "Backup: forward the application confirmation email to import it.";
    showToast(msg);
    await setLastStatusMessage(msg);
    return;
  }

  const dedupeKey = `${p}|${details.company}|${details.jobTitle}|${jobUrl}`;
  if (dedupeKey === lastSendKey) return;
  lastSendKey = dedupeKey;

  const payload = {
    platform: p,
    jobTitle: details.jobTitle,
    company: details.company,
    location: details.location || "",
    jobUrl,
    appliedAt: new Date().toISOString(),
    timezone: timezone(),
    messageId: `ext-${p}-${Date.now()}`,
    detectedVia: "mutation_observer_apply_confirmation",
    pageTitle,
  } as const;

  // ✅ CORS-safe import
  const res = await importViaBackground(payload);

  if (!res.ok) {
    const err = `Ontrac Tracker import failed: ${res.error}`;
    showToast(err);
    await setLastStatusMessage(err);
    return;
  }

  const okMsg = res.deduped
    ? "Ontrac Tracker: application already imported (deduped)."
    : "Ontrac Tracker: application imported successfully.";
  showToast(okMsg);
  await setLastStatusMessage(okMsg);
}

function startObserver() {
  if (observer) return;

  observer = new MutationObserver(() => {
    const p = platform();
    if (!p) return;

    // LinkedIn is a SPA; DOM swaps can remove our bar
    ensureTopBar();

    const text = getPageTextSample();
    if (!appliedSignal(p, text)) return;

    void handleDetectedApply(p);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
  lastSendKey = null;
}

async function applyEnabled(enabled: boolean) {
  if (enabled) {
    ensureTopBar();
    startObserver();
  } else {
    removeTopBar();
    stopObserver();
  }
}

async function init() {
  const settings = await getSettings();
  await applyEnabled(Boolean(settings.enabled));
}

// Listen for popup toggles
chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg?.type === "UC125_STATE_CHANGED") {
    void applyEnabled(Boolean(msg.enabled));
  }
});

// Listen for local disable via injected bar
window.addEventListener("message", (ev: MessageEvent) => {
  if ((ev as any)?.data?.type === "UC125_LOCAL_DISABLE") {
    void setEnabled(false);
    void applyEnabled(false);
  }
});

void init();
