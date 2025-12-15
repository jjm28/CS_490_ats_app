// src/components/Applications/ApplicationSchedulerPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  type ApplicationSchedule,
  type BestPracticesResponse,
  type JobLite,
  type SubmissionTimeStats,
  cancelSchedule,
  createSchedule,
  getBestPractices,
  getDefaultNotificationEmail,
  getSubmissionTimeStats,
  listEligibleJobsLite,
  listJobsLite,
  listSchedules,
  rescheduleSchedule,
  setDefaultNotificationEmail,
  submitNow,
} from "../../api/applicationScheduler";

import SubmissionTimeStatsPanel from "./SubmissionTimeStatsPanel";
import ScheduleForm from "./ScheduleForm";
import ScheduleCalendar from "./ScheduleCalendar";

// ✅ UC-125: new connect panel (replaces import form)
import ExtensionConnectCard from "./ExtensionConnectCard";

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

function formatInTimeZone(dtIso?: string | null, tz?: string) {
  if (!dtIso) return "—";
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, tz ? { timeZone: tz } : undefined);
}

function statusBadge(status: string) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
  if (status === "submitted") return `${base} bg-green-100 text-green-800`;
  if (status === "expired") return `${base} bg-red-100 text-red-800`;
  if (status === "cancelled") return `${base} bg-gray-100 text-gray-700`;
  return `${base} bg-orange-100 text-orange-800`;
}

/** local helper (same algorithm as ScheduleForm) */
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
  let guess = new Date(Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, 0));
  for (let i = 0; i < 2; i++) {
    const p = tzParts(guess, timeZone);
    const desired = Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, 0);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    guess = new Date(guess.getTime() + (desired - actual));
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
    hour: String(Number(hour)),
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

  if (fields.ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  return zonedToUtcDate({ year: y, month: m, day: d, hour: h, minute: min }, timeZone).toISOString();
}

export default function ApplicationSchedulerPage() {
  const [jobsAll, setJobsAll] = useState<JobLite[]>([]);
  const [jobsEligible, setJobsEligible] = useState<JobLite[]>([]);
  const [schedules, setSchedules] = useState<ApplicationSchedule[]>([]);
  const [bestPractices, setBestPractices] = useState<BestPracticesResponse | null>(null);
  const [stats, setStats] = useState<SubmissionTimeStats | null>(null);

  const [defaultEmail, setDefaultEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ UC-125: connect panel toggle
  const [connectOpen, setConnectOpen] = useState(false);

  const defaultTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  const jobMap = useMemo(() => {
    const m = new Map<string, JobLite>();

    // Use both collections so the table can resolve jobId -> label
    // even when listJobsLite() isn't returning what you expect.
    for (const j of jobsAll) m.set(j._id, j);
    for (const j of jobsEligible) m.set(j._id, j);

    return m;
    }, [jobsAll, jobsEligible]);

  const scheduledJobIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of schedules) {
      if (s.status === "scheduled") ids.add(s.jobId);
    }
    return ids;
  }, [schedules]);

  const eligibleJobsFiltered = useMemo(() => {
    // Avoid duplicates: if a job is already scheduled, remove it from the selectable list.
    return jobsEligible.filter((j) => !scheduledJobIds.has(j._id));
  }, [jobsEligible, scheduledJobIds]);

  const scheduled = useMemo(
    () => schedules.filter((s) => s.status === "scheduled"),
    [schedules]
  );
  const submitted = useMemo(
    () => schedules.filter((s) => s.status === "submitted"),
    [schedules]
  );
  const expired = useMemo(
    () => schedules.filter((s) => s.status === "expired"),
    [schedules]
  );
  const cancelled = useMemo(
    () => schedules.filter((s) => s.status === "cancelled"),
    [schedules]
  );

  async function loadAll() {
    setError(null);
    setLoading(true);
    try {
      const [bp, jsAll, sc, st, elig, defEmail] = await Promise.all([
        getBestPractices(),
        listJobsLite(),
        listSchedules(),
        getSubmissionTimeStats(),
        listEligibleJobsLite(),
        getDefaultNotificationEmail(),
      ]);

      const scheduleJobIds = new Set((sc.items || []).map((s) => s.jobId));
        const missingJobIds = Array.from(scheduleJobIds).filter(
        (id) => !jsAll.some((j) => j._id === id)
        );

        // If there are missing jobs, fetch them individually
        if (missingJobIds.length > 0) {
        const fetchedJobs = await Promise.all(
            missingJobIds.map(async (id) => {
                try {
                const token = localStorage.getItem("token");
                const devUserId =
                    localStorage.getItem("x-dev-user-id") ||
                    sessionStorage.getItem("x-dev-user-id");

                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                if (token) headers.Authorization = `Bearer ${token}`;
                if (devUserId) headers["x-dev-user-id"] = devUserId;

                const res = await fetch(`http://localhost:5050/api/jobs/${id}`, {
                    method: "GET",
                    credentials: "include",
                    headers,
                });

                if (!res.ok) return null;
                return await res.json();
                } catch {
                return null;
                }
            })
            );
                    jsAll.push(...fetchedJobs.filter(Boolean));
        }

      setBestPractices(bp);

      // ✅ Keep a stable job cache for table labels:
      // listEligibleJobsLite() will REMOVE the job once it becomes scheduled,
      // so we merge jsAll + elig (and jsAll may be empty depending on /jobs?lite=1 response).
      const mergedJobs = [...(jsAll || []), ...(elig || [])].filter((j, idx, arr) => {
        const id = j?._id;
        return !!id && arr.findIndex((x) => x?._id === id) === idx;
      });

      setJobsAll(mergedJobs);
      setSchedules(sc.items || []);
      setStats(st);
      setJobsEligible(elig);
      setDefaultEmail(defEmail.email || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load scheduler data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll scheduled items to keep status in sync (e.g., cron submitted/expired)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await listSchedules(); // ✅ fetch ALL statuses
        setSchedules(r.items || []);
      } catch {
        // ignore (non-blocking)
      }
    }, 15000);

    return () => clearInterval(t);
  }, []);

   async function onCreateSchedule(payload: any) {
    setMutating(true);
    setError(null);
    try {
      const created = await createSchedule(payload);

      // ✅ Cache the selected job so the table can still label it after eligible list refresh removes it
      const createdJobId = payload?.jobId;
      const cachedJob =
        (created as any)?.job ||
        jobsEligible.find((j) => j._id === createdJobId) ||
        jobsAll.find((j) => j._id === createdJobId);

      if (createdJobId && cachedJob) {
        setJobsAll((prev) => {
          if (prev.some((j) => j._id === cachedJob._id)) return prev;
          return [cachedJob, ...prev];
        });
      }

      // optimistic add + then refresh eligible list
      setSchedules((prev) => [created, ...prev]);

      const [elig, st] = await Promise.all([
        listEligibleJobsLite(),
        getSubmissionTimeStats(),
      ]);
      setJobsEligible(elig);
      setStats(st);
    } catch (e: any) {
      setError(e?.message || "Failed to create schedule");
      throw e;
    } finally {
      setMutating(false);
    }
  }

  async function onReschedule(scheduleId: string, nextIso: string, nextTz: string) {
    setMutating(true);
    setError(null);
    try {
      const updated = await rescheduleSchedule(scheduleId, { scheduledAt: nextIso, timezone: nextTz });
      setSchedules((prev) => prev.map((p) => (p._id === scheduleId ? updated : p)));
    } catch (e: any) {
      setError(e?.message || "Failed to reschedule");
    } finally {
      setMutating(false);
    }
  }

  async function onSubmitNow(scheduleId: string) {
    setMutating(true);
    setError(null);
    try {
      const updated = await submitNow(scheduleId, { note: "manual submit-now (UI)" });
      setSchedules((prev) => prev.map((p) => (p._id === scheduleId ? updated : p)));

      // job status may change -> refresh all jobs + eligible + stats
      const [jsAll, elig, st] = await Promise.all([
        listJobsLite(),
        listEligibleJobsLite(),
        getSubmissionTimeStats(),
      ]);

      const mergedJobs = [...(jsAll || []), ...(elig || [])].filter((j, idx, arr) => {
        const id = j?._id;
        return !!id && arr.findIndex((x) => x?._id === id) === idx;
      });

      setJobsAll(mergedJobs);
      setJobsAll(jsAll);
      setJobsEligible(elig);
      setStats(st);
    } catch (e: any) {
      setError(e?.message || "Failed to submit now");
    } finally {
      setMutating(false);
    }
  }

  async function onCancel(scheduleId: string) {
    setMutating(true);
    setError(null);
    try {
      await cancelSchedule(scheduleId);
      const [sc, elig] = await Promise.all([listSchedules(), listEligibleJobsLite()]);
      setSchedules(sc.items || []);
      setJobsEligible(elig);
    } catch (e: any) {
      setError(e?.message || "Failed to cancel schedule");
    } finally {
      setMutating(false);
    }
  }

  async function onSaveDefaultEmail(email: string) {
    const r = await setDefaultNotificationEmail(email);
    setDefaultEmail(r.email || email);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-600">Loading Application Scheduler…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Application Scheduler</h1>
          <p className="text-sm text-gray-600">
            Schedule submissions, get deadline reminders by email, and track what submission times work best for you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ UC-125: connect button (replaces import form) */}
          <button
            className="px-3 py-2 rounded-md border border-green-300 bg-green-50 text-sm text-green-900 hover:bg-green-100"
            onClick={() => setConnectOpen((v) => !v)}
            disabled={mutating}
            title="Connect your Ontrac browser extension"
          >
            {connectOpen ? "Hide Extension" : "Connect Extension"}
          </button>

          <button
            className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
            onClick={loadAll}
            disabled={mutating}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* ✅ UC-125: extension connect panel */}
      <ExtensionConnectCard
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        schedules={schedules}
        onRefreshData={loadAll}
        disabled={mutating}
      />

      {/* Best Practices */}
      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-2">Best practices for timing</div>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {(bestPractices?.items || []).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {/* Create Schedule */}
      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Schedule an application submission</div>
        <ScheduleForm
          jobs={eligibleJobsFiltered}
          onCreate={onCreateSchedule}
          disabled={mutating}
          defaultEmail={defaultEmail}
          defaultTimezone={defaultTz}
          onSaveDefaultEmail={onSaveDefaultEmail}
        />
      </div>

      {/* Schedules Table */}
      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Scheduled & completed items</div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-xs text-gray-600">Scheduled</div>
            <div className="text-lg font-semibold">{scheduled.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-gray-600">Submitted</div>
            <div className="text-lg font-semibold">{submitted.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-gray-600">Expired</div>
            <div className="text-lg font-semibold">{expired.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-gray-600">Cancelled</div>
            <div className="text-lg font-semibold">{cancelled.length}</div>
          </div>
        </div>

        <div className="overflow-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Job</th>
                <th className="text-left px-3 py-2">Scheduled</th>
                <th className="text-left px-3 py-2">Deadline</th>
                <th className="text-left px-3 py-2">Notification Email</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map((s) => {
                const embedded = (s as any)?.job;
                const j = embedded || jobMap.get(s.jobId);

                const title = j?.jobTitle || j?.title || "Job";
                const company = j?.company || j?.companyName || "Company";
                const jobLabel = `${company} — ${title}`;

                return (
                  <ScheduleRow
                    key={s._id}
                    schedule={s}
                    jobLabel={jobLabel}
                    mutating={mutating}
                    onReschedule={onReschedule}
                    onSubmitNow={onSubmitNow}
                    onCancel={onCancel}
                  />
                );
              })}

              {schedules.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-gray-600" colSpan={6}>
                    No schedules yet. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Note: reminders and “scheduled time reached” emails are sent by the backend; this page auto-refreshes scheduled items every ~15s.
        </div>
      </div>

      {/* Timing Stats */}
      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">
          Your submission timing & response patterns
        </div>
        <SubmissionTimeStatsPanel stats={stats} />
        
      </div>
      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">
          Calendar
        </div>
        <ScheduleCalendar schedules={schedules} jobMap={jobMap} />
      </div>
    </div>
  );
}

function ScheduleRow(props: {
  schedule: ApplicationSchedule;
  jobLabel: string;
  mutating: boolean;
  onReschedule: (id: string, scheduledAtIso: string, timezone: string) => void;
  onSubmitNow: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { schedule: s, jobLabel, mutating, onReschedule, onSubmitNow, onCancel } = props;

  const tz = s.timezone || "America/New_York";

  const submittedAt = (s as any)?.submittedAt as string | undefined | null;
  const displayTimeIso =
    s.status === "submitted" && submittedAt ? submittedAt : s.scheduledAt;

  const initFields = useMemo(() => {
    const f = isoToZonedFields(s.scheduledAt, tz);
    return f || { date: "", hour: "9", minute: "00", ampm: "AM" as const };
  }, [s.scheduledAt, tz]);

  const [editing, setEditing] = useState(false);
  const [editTz, setEditTz] = useState(tz);
  const [fields, setFields] = useState(initFields);

  useEffect(() => {
    setEditTz(tz);
    setFields(initFields);
  }, [tz, initFields]);

  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);

  const canMutate = !mutating && s.status === "scheduled";

  return (
    <tr>
      <td className="px-3 py-2">
        <span className={statusBadge(s.status)}>{s.status}</span>
      </td>

      <td className="px-3 py-2">
        <div className="font-medium text-gray-900">{jobLabel}</div>
      </td>

      <td className="px-3 py-2">
        {!editing ? (
          <div className="text-gray-900">
            {formatInTimeZone(s.scheduledAt, tz)} <span className="text-xs text-gray-600">({tz})</span>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              className="w-full px-2 py-1 border rounded-md text-xs"
              value={editTz}
              onChange={(e) => {
                const next = e.target.value;
                setEditTz(next);

                // Re-derive display fields in the new TZ from the same ISO time
                const f = isoToZonedFields(s.scheduledAt, next);
                if (f) setFields(f);
              }}
              disabled={!canMutate}
            >
              {TZ_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-4 gap-2">
              <input
                type="date"
                className="col-span-2 px-2 py-1 border rounded-md text-xs"
                value={fields.date}
                onChange={(e) => setFields((p) => ({ ...p, date: e.target.value }))}
                disabled={!canMutate}
              />
              <select
                className="px-2 py-1 border rounded-md text-xs"
                value={fields.hour}
                onChange={(e) => setFields((p) => ({ ...p, hour: e.target.value }))}
                disabled={!canMutate}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                className="px-2 py-1 border rounded-md text-xs"
                value={fields.minute}
                onChange={(e) => setFields((p) => ({ ...p, minute: e.target.value }))}
                disabled={!canMutate}
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="px-2 py-1 border rounded-md text-xs"
                value={fields.ampm}
                onChange={(e) => setFields((p) => ({ ...p, ampm: e.target.value as "AM" | "PM" }))}
                disabled={!canMutate}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>

              <button
                className="px-2 py-1 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
                disabled={!canMutate}
                onClick={() => {
                  const iso = fieldsToIso(fields, editTz);
                  if (!iso) return;
                  onReschedule(s._id, iso, editTz);
                  setEditing(false);
                }}
              >
                Save
              </button>

              <button
                className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50"
                onClick={() => {
                  setFields(initFields);
                  setEditTz(tz);
                  setEditing(false);
                }}
                disabled={mutating}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </td>

      <td className="px-3 py-2">
        <div className="text-gray-900">
          {s.deadlineAt ? (
            <>
              {formatInTimeZone(s.deadlineAt, tz)}{" "}
              <span className="text-xs text-gray-600">({tz})</span>
              {formatInTimeZone(s.deadlineAt, tz)} <span className="text-xs text-gray-600">({tz})</span>
            </>
          ) : (
            "—"
          )}
        </div>
      </td>

      <td className="px-3 py-2">
        <div className="text-gray-900">{s.notificationEmail || "—"}</div>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {s.status === "scheduled" && !editing && (
            <button
              className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setEditing(true)}
              disabled={mutating}
            >
              Reschedule
            </button>
          )}

          <button
            className="px-2 py-1 rounded-md bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
            onClick={() => onSubmitNow(s._id)}
            disabled={!canMutate}
            title="Submit immediately (backend updates job status and schedule)"
          >
            Submit now
          </button>

          <button
            className="px-2 py-1 rounded-md bg-gray-600 text-white text-xs hover:bg-gray-700 disabled:opacity-50"
            onClick={() => onCancel(s._id)}
            disabled={!canMutate}
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
