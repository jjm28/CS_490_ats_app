// components/Jobs/CommuterPlannerSidebar.tsx
import React from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import type {
  CommuterPlannerHome,
  CommuterPlannerJob,
} from "../../../api/jobs";
import type { WorkMode } from "../../../types/jobs.types";

interface Filters {
  workMode: WorkMode[];
  maxDistanceKm?: number;
  maxDurationMinutes?: number;
}

interface Props {
  mode: "single" | "global";
  home: CommuterPlannerHome | null;
  jobs: CommuterPlannerJob[];
  filters: Filters;
  focusedJobId: string | null;
  onSetFilters: (filters: Filters) => void;
  onFocusJob: (id: string) => void;
  compareJobIds: string[];
  onToggleCompare: (id: string) => void;
}

const ALL_WORK_MODES: WorkMode[] = ["remote", "hybrid", "onsite"];

export default function CommuterPlannerSidebar({
  mode,
  home,
  jobs,
  filters,
  focusedJobId,
  onSetFilters,
  onFocusJob,
  compareJobIds,
  onToggleCompare,
}: Props) {
  const handleToggleWorkMode = (wm: WorkMode) => {
    const current = new Set(filters.workMode);
    if (current.has(wm)) current.delete(wm);
    else current.add(wm);
    onSetFilters({
      ...filters,
      workMode: Array.from(current),
    });
  };

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSetFilters({
      ...filters,
      maxDistanceKm: value ? Number(value) : undefined,
    });
  };

  const handleDurationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    onSetFilters({
      ...filters,
      maxDurationMinutes: value ? Number(value) : undefined,
    });
  };

  const handleResetFilters = () => {
    onSetFilters({
      workMode: [],
      maxDistanceKm: undefined,
      maxDurationMinutes: undefined,
    });
  };

  const jobCount = jobs.length;

  const formatCommute = (job: CommuterPlannerJob) => {
    if (!job.commute) return "No commute data";
    const km = job.commute.distanceKm;
    const minutes = job.commute.durationMinutes;
    return `${km.toFixed(1)} km • ${minutes} min`;
  };

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Filters</h2>
            <Button size="sm" variant="ghost" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-600">
              Work mode
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_WORK_MODES.map((wm) => {
                const active = filters.workMode.includes(wm);
                return (
                  <button
                    key={wm}
                    type="button"
                    className={`px-2 py-1 rounded-full text-xs border ${
                      active
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-gray-50 border-gray-300 text-gray-700"
                    }`}
                    onClick={() => handleToggleWorkMode(wm)}
                  >
                    {wm.charAt(0).toUpperCase() + wm.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Max distance (km)
            </label>
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1 text-sm"
              value={filters.maxDistanceKm ?? ""}
              onChange={handleDistanceChange}
              placeholder="e.g. 30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Max commute time (minutes)
            </label>
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1 text-sm"
              value={filters.maxDurationMinutes ?? ""}
              onChange={handleDurationChange}
              placeholder="e.g. 45"
            />
          </div>

          <div className="text-xs text-gray-600">
            Showing <span className="font-semibold">{jobCount}</span>{" "}
            job{jobCount === 1 ? "" : "s"} on map.
          </div>

          {mode === "single" && home && (
            <div className="text-xs text-gray-700 border-t pt-2 mt-2">
              Single-job mode: filters are ignored for this view. Use
              &ldquo;Show all jobs&rdquo; to explore everything.
            </div>
          )}
        </div>
      </Card>

      <Card className="max-h-[260px] lg:max-h-[340px] overflow-y-auto">
        <h2 className="text-sm font-semibold mb-2">Jobs</h2>
        {jobs.length === 0 && (
        <div className="text-xs text-gray-600">
            No jobs match your current filters. Try clearing work mode filters
            or increasing the max distance / commute time.
        </div>
        )}

        <div className="flex flex-col gap-2">
          {jobs.map((job) => {
            const isFocused = job.id === focusedJobId;
            const inCompare = compareJobIds.includes(job.id);
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onFocusJob(job.id)}
                className={`w-full text-left border rounded p-2 text-xs transition ${
                  isFocused
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[11px] mb-0.5">
                      {job.title}
                    </div>
                    <div className="text-[11px] text-gray-600 mb-1">
                      {job.company}
                    </div>
                    {job.location && (
                      <div className="text-[11px] text-gray-500">
                        {job.location.city ||
                          job.location.normalized ||
                          job.location.raw}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-700">
                      {formatCommute(job)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {job.workMode && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px]">
                        {job.workMode.toUpperCase()}
                      </span>
                    )}
                    <label className="flex items-center gap-1 text-[10px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={inCompare}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleCompare(job.id);
                        }}
                      />
                      Compare
                    </label>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </>
  );
}
