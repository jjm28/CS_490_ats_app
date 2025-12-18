import { completePairing } from "../shared/api";
import {
  clearAuth,
  getSettings,
  saveSettings,
  setAuthToken,
  setEnabled,
  setLastStatusMessage,
} from "../shared/storage";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

function setText(id: string, v: string) {
  el<HTMLElement>(id).textContent = v;
}

function show(id: string, on: boolean) {
  el<HTMLElement>(id).style.display = on ? "" : "none";
}

function setBusy(busy: boolean) {
  el<HTMLButtonElement>("pairBtn").disabled = busy;
  el<HTMLButtonElement>("saveBtn").disabled = busy;
  el<HTMLButtonElement>("disconnectBtn").disabled = busy;
  el<HTMLButtonElement>("openAppBtn").disabled = busy;
  el<HTMLInputElement>("enabledToggle").disabled = busy;
  el<HTMLInputElement>("pairInput").disabled = busy;
}

async function refreshUI() {
  const s = await getSettings();

  const connected = Boolean(s.authToken);
  show("connectedBox", connected);
  show("notConnectedBox", !connected);

  // optional “pill” text if you have these IDs in popup.html
  const statusPill = document.getElementById("connPill");
  if (statusPill) {
    statusPill.textContent = connected ? "Connected" : "Not connected";
    statusPill.className = connected ? "pill pill--ok" : "pill pill--warn";
  }

  setText("apiBaseVal", s.apiBase);
  setText("appBaseVal", s.appBase || "");

  if (connected) {
    setText(
      "connectedMeta",
      `Paired ${s.pairedAt ? `at ${new Date(s.pairedAt).toLocaleString()}` : ""}`
    );
  }

  el<HTMLInputElement>("enabledToggle").checked = Boolean(s.enabled);

  setText("statusMsg", s.lastStatusMessage || "No recent activity yet.");

  setText(
    "supportedMsg",
    "LinkedIn Jobs, Indeed, and Glassdoor job pages. (LinkedIn: /jobs/*, Indeed: indeed.com/*, Glassdoor: glassdoor.com/Job/*)"
  );

  if (!connected) el<HTMLInputElement>("pairInput").focus();
}

async function main() {
  // Pair
  el<HTMLButtonElement>("pairBtn").addEventListener("click", async () => {
    const input = el<HTMLInputElement>("pairInput").value.trim();
    if (!input) return;

    setBusy(true);
    setText("pairError", "");

    try {
      const r = await completePairing(input);
      if (!r.ok) {
        setText(
          "pairError",
          r.error ||
            "Pairing failed. Paste the FULL pairing string from the Scheduler page: pairingId|code"
        );
        await setLastStatusMessage(`Pairing failed: ${r.error || "unknown_error"}`);
        return;
      }

      await setAuthToken(r.token, r.userId);

      // UX: turn it ON immediately after a successful pairing
      await setEnabled(true);
      chrome.runtime.sendMessage({ type: "UC125_STATE_CHANGED", enabled: true });

      await setLastStatusMessage("Connected. Tracker is ON.");
      await refreshUI();
    } finally {
      setBusy(false);
    }
  });

  // Toggle enabled
  el<HTMLInputElement>("enabledToggle").addEventListener("change", async (ev) => {
    const checked = (ev.target as HTMLInputElement).checked;
    await setEnabled(Boolean(checked));
    chrome.runtime.sendMessage({ type: "UC125_STATE_CHANGED", enabled: Boolean(checked) });
    await refreshUI();
  });

  // Save base URLs
  el<HTMLButtonElement>("saveBtn").addEventListener("click", async () => {
    const apiBase = el<HTMLInputElement>("apiBase").value.trim();
    const appBase = el<HTMLInputElement>("appBase").value.trim();
    await saveSettings({ apiBase: apiBase || undefined, appBase: appBase || undefined });
    await refreshUI();
  });

  // Disconnect
  el<HTMLButtonElement>("disconnectBtn").addEventListener("click", async () => {
    await clearAuth();
    await setLastStatusMessage("Disconnected.");
    await refreshUI();
  });

  // Open app
  el<HTMLButtonElement>("openAppBtn").addEventListener("click", async () => {
    const s = await getSettings();
    const base = (s.appBase || "http://localhost:5173").replace(/\/+$/, "");
    chrome.tabs.create({ url: `${base}/Applications/Scheduler` });
  });

  await refreshUI();
}

document.addEventListener("DOMContentLoaded", () => void main());
