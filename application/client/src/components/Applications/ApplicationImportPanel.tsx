// src/components/Applications/ApplicationImportPanel.tsx

import React, { useMemo, useState } from "react";
import {
  importApplicationEmail,
  type ImportApplicationEmailPayload,
  type ImportApplicationResponse,
} from "../../api/applicationImport";

type Props = {
  onImported?: (res: ImportApplicationResponse) => void | Promise<void>;
};

const PLATFORM_OPTIONS = ["linkedin", "indeed", "glassdoor", "other"] as const;

function isoNowRounded() {
  const d = new Date();
  d.setSeconds(0, 0);
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ApplicationImportPanel({ onImported }: Props) {
  const [platform, setPlatform] = useState<string>("linkedin");
  const [timezone, setTimezone] = useState<string>("America/New_York");

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  const [jobUrl, setJobUrl] = useState("");

  const [messageId, setMessageId] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");

  const [appliedAtLocal, setAppliedAtLocal] = useState<string>(isoNowRounded());

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportApplicationResponse | null>(null);

  const appliedAtIso = useMemo(() => {
    if (!appliedAtLocal) return undefined;
    const d = new Date(appliedAtLocal);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }, [appliedAtLocal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setResult(null);

    try {
      const payload: ImportApplicationEmailPayload = {
        platform,
        timezone,

        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        location: location.trim() || undefined,

        jobUrl: jobUrl.trim() || undefined,

        messageId: messageId.trim() || undefined,
        emailFrom: emailFrom.trim() || undefined,
        emailSubject: emailSubject.trim() || undefined,
        emailBodyText: emailBodyText.trim() || undefined,

        appliedAt: appliedAtIso,
      };

      const res = await importApplicationEmail(payload);
      setResult(res);

      if (onImported) await onImported(res);
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Import an application (UC-125)</h3>
        <div className="text-xs text-gray-500">
          Creates/merges a Job + ensures a submitted Schedule
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Platform</span>
          <select
            className="rounded-md border p-2"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Timezone</span>
          <input
            className="rounded-md border p-2"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/New_York"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Job Title (optional)</span>
          <input
            className="rounded-md border p-2"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Backend Engineer"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Company (optional)</span>
          <input
            className="rounded-md border p-2"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Beta Corp"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Location (optional)</span>
          <input
            className="rounded-md border p-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Newark, NJ"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Job URL (recommended)</span>
          <input
            className="rounded-md border p-2"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/view/999"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Message ID (recommended for dedupe)</span>
          <input
            className="rounded-md border p-2"
            value={messageId}
            onChange={(e) => setMessageId(e.target.value)}
            placeholder="<uc125-beta-1@linkedin.com>"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Applied At</span>
          <input
            className="rounded-md border p-2"
            type="datetime-local"
            value={appliedAtLocal}
            onChange={(e) => setAppliedAtLocal(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-sm font-medium">Email From (optional)</span>
          <input
            className="rounded-md border p-2"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder="jobs-noreply@linkedin.com"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-sm font-medium">Email Subject (optional)</span>
          <input
            className="rounded-md border p-2"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Your application was sent to Beta Corp"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-medium">Email Body Text (optional)</span>
          <textarea
            className="min-h-[84px] rounded-md border p-2"
            value={emailBodyText}
            onChange={(e) => setEmailBodyText(e.target.value)}
            placeholder="Paste the email body here (used for extraction if jobTitle/company not provided)."
          />
        </label>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {busy ? "Importing..." : "Import Application"}
          </button>

          {err && <div className="text-sm text-red-600">{err}</div>}

          {result && (
            <div className="text-sm text-gray-700">
              {result.deduped ? (
                <>Deduped ({result.reason || "already imported"})</>
              ) : (
                <>Imported (jobId: {result.jobId})</>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
