import React, { useMemo, useState } from "react";
import type { ApplicationSchedule } from "../../api/applicationScheduler";

type PairStartResponse =
  | { ok: true; pairingId: string; code: string; expiresAt: string }
  | { ok?: false; error?: string };

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const devUserId =
    localStorage.getItem("x-dev-user-id") ||
    sessionStorage.getItem("x-dev-user-id");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (devUserId) headers["x-dev-user-id"] = devUserId;

  return headers;
}

function fmtLocal(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function findLastImportedSchedule(schedules: ApplicationSchedule[]) {
  // Imported schedules created by UC-125 use audit.meta.source === "uc125" (per your backend output)
  const imported = schedules.filter((s: any) =>
    Array.isArray(s?.audit)
      ? s.audit.some((a: any) => a?.meta?.source === "uc125")
      : false
  );

  imported.sort((a: any, b: any) => {
    const aIso = a?.submittedAt || a?.scheduledAt;
    const bIso = b?.submittedAt || b?.scheduledAt;
    const at = new Date(aIso).getTime();
    const bt = new Date(bIso).getTime();
    return bt - at;
  });

  return imported[0] || null;
}

export default function ExtensionConnectCard(props: {
  open: boolean;
  onClose: () => void;
  schedules: ApplicationSchedule[];
  onRefreshData?: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const { open, onClose, schedules, onRefreshData, disabled } = props;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pairing, setPairing] = useState<{
    pairingId: string;
    code: string;
    expiresAt: string;
  } | null>(null);

  const supportedPages = useMemo(
    () => [
      { name: "LinkedIn Jobs", urlPattern: "https://www.linkedin.com/jobs/*" },
      { name: "Indeed", urlPattern: "https://www.indeed.com/*" },
      { name: "Glassdoor Jobs", urlPattern: "https://www.glassdoor.com/Job/*" },
    ],
    []
  );

  const lastImported = useMemo(
    () => findLastImportedSchedule(schedules),
    [schedules]
  );

  async function startPairing() {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch(
        "http://localhost:5050/api/application-import/pair/start",
        {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({ deviceName: "Ontrac Chrome Extension" }),
        }
      );

      const data = (await res.json()) as PairStartResponse;
      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || "Failed to start pairing.");
      }

      setPairing({
        pairingId: (data as any).pairingId,
        code: (data as any).code,
        expiresAt: (data as any).expiresAt,
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to start pairing.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!pairing?.code) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
    } catch {
      // non-blocking
    }
  }

  async function refresh() {
    try {
      await onRefreshData?.();
    } catch {
      // non-blocking
    }
  }

  if (!open) return null;

  return (
    <div className="rounded-md border border-green-200 bg-green-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-green-900">
            Connect Ontrac Browser Extension
          </div>
          <div className="mt-1 text-sm text-green-900/80">
            Once connected and turned on, Ontrac will auto-import applications you submit on supported job platforms and
            they will appear in your scheduler and calendar like any other application.
          </div>
        </div>

        <button
          className="px-3 py-2 rounded-md border border-green-300 text-sm text-green-900 hover:bg-green-100"
          onClick={onClose}
          disabled={busy}
        >
          Close
        </button>
      </div>

      {err && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: pairing */}
        <div className="rounded-md border border-green-200 bg-white p-3">
          <div className="text-sm font-semibold text-green-900">Pairing</div>
          <div className="mt-1 text-sm text-green-900/80">
            Click “Generate code”, then open the extension popup in Chrome and enter the code to connect.
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="px-3 py-2 rounded-md bg-green-700 text-white text-sm hover:bg-green-800 disabled:opacity-60"
              onClick={startPairing}
              disabled={disabled || busy}
            >
              {busy ? "Generating..." : pairing ? "Regenerate code" : "Generate code"}
            </button>

            {pairing?.code && (
              <button
                className="px-3 py-2 rounded-md border border-green-300 text-green-900 text-sm hover:bg-green-100"
                onClick={copyCode}
                disabled={busy}
              >
                Copy code
              </button>
            )}

            <button
              className="px-3 py-2 rounded-md border border-green-300 text-green-900 text-sm hover:bg-green-100"
              onClick={refresh}
              disabled={disabled || busy}
              title="Refresh schedules/jobs to see newly imported applications"
            >
              Refresh data
            </button>
          </div>

          {pairing?.code ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
              <div className="text-xs text-green-900/70">Your pairing code</div>
              <div className="mt-1 text-2xl font-bold tracking-widest text-green-900">
                {pairing.code}
              </div>
              <div className="mt-1 text-xs text-green-900/70">
                Expires at: {fmtLocal(pairing.expiresAt)}
              </div>
              <div className="mt-2 text-sm text-green-900/80">
                In the extension popup:
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Click <span className="font-medium">Connect / Pair</span></li>
                  <li>Enter this code</li>
                  <li>Toggle the extension <span className="font-medium">ON</span></li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-green-900/80">
              No active pairing code yet.
            </div>
          )}
        </div>

        {/* Right: status + supported pages */}
        <div className="rounded-md border border-green-200 bg-white p-3">
          <div className="text-sm font-semibold text-green-900">Status & Supported Pages</div>

          <div className="mt-2 text-sm text-green-900/80">
            <div className="font-medium text-green-900">How to confirm it’s ON</div>
            <div className="mt-1">
              When the extension is ON and you’re on a supported job site, you’ll see the Ontrac top bar injected on the page.
              After you apply, the extension will import the application automatically.
            </div>
          </div>

          <div className="mt-3">
            <div className="text-sm font-medium text-green-900">Works on</div>
            <ul className="mt-1 list-disc pl-5 text-sm text-green-900/80 space-y-1">
              {supportedPages.map((p) => (
                <li key={p.name}>
                  <span className="font-medium">{p.name}:</span> {p.urlPattern}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs text-green-900/70">
              Backup: If a page can’t be parsed reliably, email-forwarding import can still capture confirmation emails (LinkedIn/Indeed/Glassdoor).
            </div>
          </div>

          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
            <div className="text-xs text-green-900/70">Last imported (from UC-125)</div>
            {lastImported ? (
              <div className="mt-1 text-sm text-green-900">
                <div className="font-medium">
                  {(lastImported as any)?.job?.company || "Company"} —{" "}
                  {(lastImported as any)?.job?.jobTitle || "Job"}
                </div>
                <div className="text-green-900/80">
                  Imported at:{" "}
                  {fmtLocal((lastImported as any)?.submittedAt || lastImported.scheduledAt)}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-sm text-green-900/80">
                No imported applications detected yet. Apply to a job on a supported page while the extension is ON, then refresh.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
