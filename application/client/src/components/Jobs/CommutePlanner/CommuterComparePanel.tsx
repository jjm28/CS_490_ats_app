// components/Jobs/CommuterComparePanel.tsx
import React from "react";
import Card from "../../StyledComponents/Card";
import type { CommuterPlannerJob } from "../../../api/jobs";

interface Props {
  jobs: CommuterPlannerJob[];
  compareJobIds: string[];
}

export default function CommuterComparePanel({
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
                Time zone: {job.timeZone}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
