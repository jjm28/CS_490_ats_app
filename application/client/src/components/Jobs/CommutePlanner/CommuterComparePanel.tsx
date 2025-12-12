// components/Jobs/CommuterComparePanel.tsx
import React from "react";
import Card from "../../StyledComponents/Card";
import type { CommuterPlannerJob, CommuterPlannerHome } from "../../../api/jobs";

interface Props {
  home: CommuterPlannerHome | null;
  jobs: CommuterPlannerJob[];
  compareJobIds: string[];
}

function formatTimeZoneWithHomeDiff(
  home: CommuterPlannerHome | null,
  jobTz: string | null
): string {
  if (!jobTz) return "Unknown";
  const homeTz = home?.timeZone;
  if (!homeTz || homeTz === jobTz) return `${jobTz} (same as home)`;

  try {
    const now = new Date();
    const homeHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: homeTz,
        hour12: false,
        hour: "2-digit",
      }).format(now)
    );
    const jobHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: jobTz,
        hour12: false,
        hour: "2-digit",
      }).format(now)
    );

    let diff = jobHour - homeHour;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;

    const sign = diff > 0 ? "+" : "";
    return `${jobTz} (${sign}${diff}h)`;
  } catch {
    return jobTz;
  }
}

export default function CommuterComparePanel({
  home,
  jobs,
  compareJobIds,
}: Props) {
  const selected = jobs.filter(
    (j) => compareJobIds.includes(j.id) && j.commute
  );

  if (selected.length < 2) return null;

  // Determine optimal commute
  const best = [...selected].sort((a, b) => {
    if (a.commute!.durationMinutes !== b.commute!.durationMinutes) {
      return a.commute!.durationMinutes - b.commute!.durationMinutes;
    }
    return a.commute!.distanceKm - b.commute!.distanceKm;
  })[0];

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-1">Commute comparison</h2>
      <p className="text-xs text-gray-600 mb-4">
        Comparing selected jobs by commute time and distance
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selected.map((job) => {
          const isBest = job.id === best.id;

          return (
            <div
              key={job.id}
              className={`rounded-lg border p-3 text-xs ${
                isBest
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold text-[12px]">
                  {job.title}
                </div>
                {isBest && (
                  <span className="text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    Best commute
                  </span>
                )}
              </div>

              <div className="text-[11px] text-gray-600 mb-2">
                {job.company}
              </div>

              {job.location && (
                <div className="text-[11px] text-gray-500 mb-2">
                  {job.location.city ||
                    job.location.normalized ||
                    job.location.raw}
                </div>
              )}

              <div className="flex gap-3 mb-2">
                <div>
                  <div className="text-[10px] text-gray-500">Distance</div>
                  <div className="font-medium">
                    {job.commute!.distanceKm.toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Time</div>
                  <div className="font-medium">
                    {job.commute!.durationMinutes} min
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-600 mb-1">
                Work mode: {job.workMode ?? "—"}
              </div>

              {job.timeZone && (
                <div className="text-[11px] text-gray-500">
                  Time zone:{" "}
                  {formatTimeZoneWithHomeDiff(home, job.timeZone)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
