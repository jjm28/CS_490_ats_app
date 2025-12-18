import { completePairing } from "../shared/api";
import { clearAuth, getSettings, saveSettings, setAuthToken } from "../shared/storage";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function setText(id: string, v: string) {
  el<HTMLElement>(id).textContent = v;
}

function setBusy(b: boolean) {
  el<HTMLButtonElement>("saveBtn").disabled = b;
  el<HTMLButtonElement>("pairBtn").disabled = b;
  el<HTMLButtonElement>("disconnectBtn").disabled = b;
}

async function load() {
  const s = await getSettings();

  el<HTMLInputElement>("apiBase").value = s.apiBase || "";
  el<HTMLInputElement>("appBase").value = s.appBase || "";
  el<HTMLInputElement>("devUserId").value = s.devUserId || "";
  el<HTMLInputElement>("authToken").value = s.authToken ? `Bearer ${s.authToken}` : "";
  setText("connState", s.authToken ? "Connected" : "Not connected");
}

async function main() {
  await load();

  el<HTMLButtonElement>("saveBtn").addEventListener("click", async () => {
    const apiBase = el<HTMLInputElement>("apiBase").value.trim();
    const appBase = el<HTMLInputElement>("appBase").value.trim();
    const devUserId = el<HTMLInputElement>("devUserId").value.trim();
    const authTokenRaw = el<HTMLInputElement>("authToken").value.trim();

    await saveSettings({
      apiBase: apiBase || undefined,
      appBase: appBase || undefined,
      devUserId: devUserId || undefined,
      authToken: authTokenRaw ? authTokenRaw.replace(/^Bearer\s+/i, "") : undefined,
    });

    await load();
    setText("msg", "Saved.");
    setTimeout(() => setText("msg", ""), 1200);
  });

  el<HTMLButtonElement>("pairBtn").addEventListener("click", async () => {
    const input = el<HTMLInputElement>("pairInput").value.trim();
    if (!input) return;

    setBusy(true);
    setText("pairMsg", "");
    try {
      const r = await completePairing(input);
      if (!r.ok) {
        setText("pairMsg", r.error);
        return;
      }
      await setAuthToken(r.token, r.userId);
      await load();
      setText("pairMsg", "Connected.");
    } finally {
      setBusy(false);
    }
  });

  el<HTMLButtonElement>("disconnectBtn").addEventListener("click", async () => {
    await clearAuth();
    await load();
    setText("pairMsg", "Disconnected.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  void main();
});
