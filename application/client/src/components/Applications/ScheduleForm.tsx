// src/components/Applications/ScheduleForm.tsx

import React, { useEffect, useMemo, useState } from "react";
import type { CreateSchedulePayload, JobLite } from "../../api/applicationScheduler";

const TZ_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function safeEmailLooksValid(v: string) {
  // simple, non-strict
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function tzParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function zonedToUtcDate(args: { year: number; month: number; day: number; hour: number; minute: number }, timeZone: string) {
  // Iterative correction approach (handles DST transitions better than naive offsets)
  let guess = new Date(Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, 0));

  for (let i = 0; i < 2; i++) {
    const p = tzParts(guess, timeZone);

    const desired = Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, 0);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);

    const diff = desired - actual;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}

function isoToZonedFields(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = dtf.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = (get("dayPeriod") || "AM") as "AM" | "PM";

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    date: `${year}-${month}-${day}`,
    hour: String(Number(hour)), // "1".."12"
    minute,
    ampm: dayPeriod,
  };
}

function fieldsToIso(fields: { date: string; hour: string; minute: string; ampm: "AM" | "PM" }, timeZone: string) {
  const [y, m, d] = fields.date.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;

  let h = Number(fields.hour);
  if (Number.isNaN(h) || h < 1 || h > 12) return null;

  const min = Number(fields.minute);
  if (Number.isNaN(min) || min < 0 || min > 59) return null;

  // convert to 24h
  if (fields.ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  const utcDate = zonedToUtcDate({ year: y, month: m, day: d, hour: h, minute: min }, timeZone);
  return utcDate.toISOString();
}

function nowDefaults(timeZone: string) {
  const now = new Date();
  // round to next 5 minutes in the given TZ by converting to parts
  const p = tzParts(now, timeZone);

  let hour = p.hour;
  let minute = p.minute;

  minute = Math.ceil(minute / 5) * 5;
  if (minute === 60) {
    minute = 0;
    hour = (hour + 1) % 24;
  }

  const date = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;

  // map to 12h
  const ampm: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;

  return { date, hour: String(hour12), minute: pad2(minute), ampm };
}

export default function ScheduleForm(props: {
  jobs: JobLite[];
  defaultEmail?: string | null;
  defaultTimezone?: string;
  onCreate: (payload: CreateSchedulePayload) => Promise<any>;
  onSaveDefaultEmail?: (email: string) => Promise<void>;
  disabled?: boolean;
}) {
  const { jobs, onCreate, disabled, defaultEmail, defaultTimezone, onSaveDefaultEmail } = props;

  const initialTz =
    defaultTimezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "America/New_York";

  const [jobId, setJobId] = useState("");
  const [timezone, setTimezone] = useState(initialTz);

  const [emailTouched, setEmailTouched] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState(defaultEmail || "");

  // Scheduled fields
  const [scheduledFields, setScheduledFields] = useState(() => nowDefaults(initialTz));

  // Deadline fields (optional)
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineFields, setDeadlineFields] = useState(() => nowDefaults(initialTz));

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const job = useMemo(() => jobs.find((j) => j._id === jobId) || null, [jobs, jobId]);

  // Keep email synced with backend default ONLY until user edits it.
  useEffect(() => {
    if (!emailTouched) setNotificationEmail(defaultEmail || "");
  }, [defaultEmail, emailTouched]);

  // When timezone changes, reset defaults in that TZ (without clobbering chosen job)
  useEffect(() => {
    setScheduledFields((prev) => {
      // Try to preserve date if set; otherwise default now
      if (prev?.date) return prev;
      return nowDefaults(timezone);
    });

    setDeadlineFields((prev) => {
      if (prev?.date) return prev;
      return nowDefaults(timezone);
    });
  }, [timezone]);

  // When job changes: if it has a deadline, prefill deadline fields and enable deadline.
  useEffect(() => {
  const raw = job?.applicationDeadline || job?.deadline;
  if (!raw) return;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return; // Prevent invalid time crash

  const f = isoToZonedFields(parsed.toISOString(), timezone);
  if (!f) return;

  setDeadlineFields(f);
  setDeadlineEnabled(true);
}, [job?._id, timezone]);

  const timeOptions = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = Array.from({ length: 60 }, (_, i) => pad2(i));
    return { hours, minutes };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!jobId) {
      setError("Select an interested job first.");
      return;
    }

    const scheduledIso = fieldsToIso(scheduledFields, timezone);
    if (!scheduledIso) {
      setError("Choose a valid scheduled date + time.");
      return;
    }

    let deadlineIso: string | null | undefined = null;
    if (deadlineEnabled) {
      const dIso = fieldsToIso(deadlineFields, timezone);
      if (!dIso) {
        setError("Choose a valid deadline date + time (or turn off the deadline).");
        return;
      }
      deadlineIso = dIso;
    }

    const email = (notificationEmail || "").trim();
    if (email && !safeEmailLooksValid(email)) {
      setError("Notification email looks invalid.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        jobId,
        scheduledAt: scheduledIso,
        deadlineAt: deadlineEnabled ? deadlineIso : null,
        timezone,
        notificationEmail: email, // may be blank; backend will default
      });

      // Optional: persist email as default immediately
      if (email && onSaveDefaultEmail) {
        await onSaveDefaultEmail(email);
      }

      // Reset only schedule time; keep email/timezone for next schedule
      setScheduledFields(nowDefaults(timezone));
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to create schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailBlur() {
    const email = (notificationEmail || "").trim();
    if (!email) return;
    if (!safeEmailLooksValid(email)) return;
    if (!onSaveDefaultEmail) return;

    try {
      await onSaveDefaultEmail(email);
    } catch {
      // non-blocking
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job picker */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Interested job</label>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={disabled || saving}
          >
            <option value="">Select an interested job…</option>
            {jobs.map((j) => {
              const title = j.jobTitle || j.title || "Job";
              const company = j.company || j.companyName || "Company";
              const dl = j.applicationDeadline || j.deadline;
              const dlText = dl ? ` — deadline ${new Date(dl).toLocaleDateString()}` : "";
              return (
                <option key={j._id} value={j._id}>
                  {company} — {title}
                  {dlText}
                </option>
              );
            })}
          </select>
          <div className="text-xs text-gray-600 mt-1">
            Only jobs marked <span className="font-medium">interested</span> appear here.
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Timezone</label>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={disabled || saving}
          >
            {TZ_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-600 mt-1">
            All date/time pickers below interpret values in this timezone.
          </div>
        </div>

        {/* Notification email */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">Notification email</label>
          <input
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={notificationEmail}
            onChange={(e) => {
              setEmailTouched(true);
              setNotificationEmail(e.target.value);
            }}
            onBlur={handleEmailBlur}
            placeholder="you@example.com"
            disabled={disabled || saving}
          />
          <div className="text-xs text-gray-600 mt-1">
            Autofills from your account/default email. If you type a different email, it becomes the new default.
          </div>
        </div>
      </div>

      {/* Scheduled datetime */}
      <div className="rounded-md border p-3">
        <div className="text-sm font-semibold text-gray-900 mb-2">Scheduled submission time</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={scheduledFields.date}
              onChange={(e) => setScheduledFields((p) => ({ ...p, date: e.target.value }))}
              disabled={disabled || saving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hour</label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={scheduledFields.hour}
              onChange={(e) => setScheduledFields((p) => ({ ...p, hour: e.target.value }))}
              disabled={disabled || saving}
            >
              {timeOptions.hours.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Minute</label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={scheduledFields.minute}
              onChange={(e) => setScheduledFields((p) => ({ ...p, minute: e.target.value }))}
              disabled={disabled || saving}
            >
              {timeOptions.minutes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">AM/PM</label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={scheduledFields.ampm}
              onChange={(e) => setScheduledFields((p) => ({ ...p, ampm: e.target.value as "AM" | "PM" }))}
              disabled={disabled || saving}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deadline */}
      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-sm font-semibold text-gray-900">Application deadline</div>

          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={deadlineEnabled}
              onChange={(e) => setDeadlineEnabled(e.target.checked)}
              disabled={disabled || saving}
            />
            Enable deadline reminders
          </label>
        </div>

        {deadlineEnabled ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={deadlineFields.date}
                onChange={(e) => setDeadlineFields((p) => ({ ...p, date: e.target.value }))}
                disabled={disabled || saving}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hour</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={deadlineFields.hour}
                onChange={(e) => setDeadlineFields((p) => ({ ...p, hour: e.target.value }))}
                disabled={disabled || saving}
              >
                {timeOptions.hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Minute</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={deadlineFields.minute}
                onChange={(e) => setDeadlineFields((p) => ({ ...p, minute: e.target.value }))}
                disabled={disabled || saving}
              >
                {timeOptions.minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AM/PM</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={deadlineFields.ampm}
                onChange={(e) => setDeadlineFields((p) => ({ ...p, ampm: e.target.value as "AM" | "PM" }))}
                disabled={disabled || saving}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600">
            If you enable this, the backend will send reminders as the deadline approaches.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={disabled || saving}
        >
          {saving ? "Scheduling…" : "Create schedule"}
        </button>
      </div>
    </form>
  );
}
