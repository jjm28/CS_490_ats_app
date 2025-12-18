import { setEnabled } from "../shared/storage";

const BAR_ID = "uc125-ontrac-bar";
const TOAST_ID = "uc125-ontrac-toast";
const PAD_CLASS = "uc125-ontrac-body-pad";

export function ensureTopBar(): void {
  if (document.getElementById(BAR_ID)) return;

  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.innerHTML = `
    <div class="left">
      <div class="title">ontrac tracker: on</div>
      <div class="meta">UC-125 – auto-importing applications on this site</div>
    </div>
    <div class="right">
      <button id="uc125-ontrac-off">Turn OFF</button>
    </div>
  `;

  document.documentElement.appendChild(bar);
  document.body.classList.add(PAD_CLASS);

  const btn = bar.querySelector<HTMLButtonElement>("#uc125-ontrac-off");
  btn?.addEventListener("click", async () => {
    await setEnabled(false);
    // notify content script listeners in this tab
    window.postMessage({ type: "UC125_LOCAL_DISABLE" }, "*");
  });
}

export function removeTopBar(): void {
  document.getElementById(BAR_ID)?.remove();
  document.getElementById(TOAST_ID)?.remove();
  document.body.classList.remove(PAD_CLASS);
}

export function showToast(message: string): void {
  // one toast at a time
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = message;
  document.documentElement.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 6000);
}
