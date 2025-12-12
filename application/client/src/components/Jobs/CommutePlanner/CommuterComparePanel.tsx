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
  if (!jobTz) return "Unknown time zone";
  const homeTz = home?.timeZone || null;
  console.log(home)
  if (!homeTz || homeTz === jobTz) {
    return `${jobTz} (same as home)`;
  }

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

    if (Number.isNaN(homeHour) || Number.isNaN(jobHour)) {
      return jobTz;
    }

    let diff = jobHour - homeHour;
    // normalize diff into -12..+12 rough range
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;

    if (diff === 0) return `${jobTz} (same as home)`;
    const sign = diff > 0 ? "+" : "-";
    const abs = Math.abs(diff);

    return `${jobTz} (${sign}${abs}h vs home)`;
  } catch {
    return jobTz;
  }
}

export default function CommuterComparePanel({
  home,
  jobs,
  compareJobIds,
}: Props) {
  const selected = jobs.filter((j) => compareJobIds.includes(j.id));

  if (selected.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-2">Compare offers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selected.map((job) => (
          <div
            key={job.id}
            className="border rounded p-2 text-xs bg-gray-50"
          >
            <div className="font-semibold text-[11px] mb-0.5">
              {job.title}
            </div>
            <div className="text-[11px] text-gray-600 mb-1">
              {job.company}
            </div>
            {job.location && (
              <div className="text-[11px] text-gray-500 mb-1">
                {job.location.city ||
                  job.location.normalized ||
                  job.location.raw}
              </div>
            )}
            {job.workMode && (
              <div className="text-[11px] text-gray-700 mb-1">
                Work mode: {job.workMode}
              </div>
            )}
            {job.commute && (
              <div className="text-[11px] text-gray-700 mb-1">
                Commute: {job.commute.distanceKm.toFixed(1)} km •{" "}
                {job.commute.durationMinutes} min
              </div>
            )}
            {job.timeZone && (
              <div className="text-[11px] text-gray-500">
                Time zone:{" "}
                {formatTimeZoneWithHomeDiff(home, job.timeZone)}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
