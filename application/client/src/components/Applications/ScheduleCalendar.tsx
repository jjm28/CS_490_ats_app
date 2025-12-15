// src/components/Applications/ScheduleCalendar.tsx

import React, { useMemo, useState } from "react";
import type { ApplicationSchedule, JobLite } from "../../api/applicationScheduler";

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function statusColor(s: ApplicationSchedule) {
  // submitted = green
  if (s.status === "submitted") return "bg-green-500";

  // cancelled stays neutral
  if (s.status === "cancelled") return "bg-gray-400";

  // deadline-based coloring for anything not submitted:
  // - deadline past => red
  // - has deadline and not past => orange
  if (s.deadlineAt) {
    const dl = new Date(s.deadlineAt).getTime();
    if (!Number.isNaN(dl)) {
      if (dl < Date.now()) return "bg-red-500";
      return "bg-orange-500";
    }
  }

  // fallback
  if (s.status === "expired") return "bg-red-500";
  return "bg-orange-500";
}

export default function ScheduleCalendar(props: {
  schedules: ApplicationSchedule[];
  jobMap: Map<string, JobLite>;
}) {
  const { schedules, jobMap } = props;
  const [cursor, setCursor] = useState(() => new Date());

  const view = useMemo(() => {
    const mStart = startOfMonth(cursor);
    const gridStart = addDays(mStart, -mStart.getDay()); // sunday start
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) grid.push(addDays(gridStart, i));

    const grouped: Record<string, ApplicationSchedule[]> = {};
    for (const s of schedules) {
      const d = new Date(s.scheduledAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = ymd(d);
      grouped[key] = grouped[key] || [];
      grouped[key].push(s);
    }

    return { grid, grouped };
  }, [cursor, schedules]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          Prev
        </button>

        <div className="text-sm font-semibold text-gray-900">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>

        <button
          className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-md overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-gray-50 px-2 py-2 text-xs font-medium text-gray-700">
            {d}
          </div>
        ))}

        {view.grid.map((d) => {
          const key = ymd(d);
          const items = view.grouped[key] || [];
          const inMonth = d.getMonth() === cursor.getMonth();

          return (
            <div
              key={key}
              className={`bg-white p-2 min-h-[90px] ${inMonth ? "" : "opacity-50"}`}
            >
              <div className="text-xs font-medium text-gray-700">{d.getDate()}</div>

              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((s) => {
                  const j = jobMap.get(s.jobId);
                  const title = `${j?.company || j?.companyName || "Company"} • ${
                    j?.jobTitle || j?.title || "Job"
                  }`;

                  return (
                    <div key={s._id} className="flex items-center gap-2 text-[11px]">
                      <span className={`h-2 w-2 rounded-full ${statusColor(s)}`} />
                      <span className="truncate text-gray-700">{title}</span>
                    </div>
                  );
                })}

                {items.length > 3 && (
                  <div className="text-[11px] text-gray-500">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
