// components/Jobs/CommuterPlannerPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import {
  fetchCommuterPlannerData,
  type CommuterPlannerJob,
  type CommuterPlannerHome,
} from "../../../api/jobs";
import CommuterPlannerMap from "./CommuterPlannerMap";
import CommuterPlannerSidebar from "./CommuterPlannerSidebar";
import CommuterComparePanel from "./CommuterComparePanel";
import type { WorkMode } from "../../../types/jobs.types";

interface Filters {
  workMode: WorkMode[];
  maxDistanceKm?: number;
  maxDurationMinutes?: number;
}

export default function CommuterPlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") || undefined;
  const [filters, setFilters] = useState<Filters>({
    workMode: [],
    maxDistanceKm: undefined,
    maxDurationMinutes: undefined,
  });

  const [home, setHome] = useState<CommuterPlannerHome | null>(null);
  const [jobs, setJobs] = useState<CommuterPlannerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [compareJobIds, setCompareJobIds] = useState<string[]>([]);

  const mode: "single" | "global" = jobId ? "single" : "global";

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCommuterPlannerData(filters, jobId);
        if (isCancelled) return;
        setHome(data.home);
        setJobs(data.jobs);
        if (jobId && data.jobs.length > 0) {
          setFocusedJobId(data.jobs[0].id);
        }
      } catch (err: any) {
        if (!isCancelled) setError(err.message || "Failed to load data");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      isCancelled = true;
    };
  }, [jobId, filters]);

  const focusedJob = useMemo(
    () => jobs.find((j) => j.id === focusedJobId) || null,
    [jobs, focusedJobId]
  );

  const handleFocusJob = (id: string) => {
    setFocusedJobId(id);
  };

  const handleToggleCompare = (id: string) => {
    setCompareJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleShowAllJobs = () => {
    searchParams.delete("jobId");
    setSearchParams(searchParams);
  };

  const handleSetFilters = (next: Filters) => {
    setFilters(next);
  };

  const modeLabel =
    mode === "single" ? "Commuter Planner – Single Job" : "Commuter Planner";

  return (
    <div className="page">
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{modeLabel}</h1>
            <p className="text-sm text-gray-600">
              Visualize your job locations and plan commute distance and time.
            </p>
          </div>
          {mode === "single" && (
            <Button variant="outline" onClick={handleShowAllJobs}>
              Show all jobs
            </Button>
          )}
        </div>
        {home && !home.geo && (
          <div className="mt-3 text-sm text-amber-600">
            Add your home location in your profile to see commute distance and
            time.
          </div>
        )}
      </Card>

      {loading && <div>Loading commuter planner…</div>}
      {error && !loading && (
        <div className="text-red-600 mb-4">Error: {error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
          <Card className="h-[480px] lg:h-[600px] overflow-hidden">
            <CommuterPlannerMap
              home={home}
              jobs={jobs}
              focusedJobId={focusedJobId}
              onJobFocus={handleFocusJob}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <CommuterPlannerSidebar
              mode={mode}
              home={home}
              jobs={jobs}
              filters={filters}
              focusedJobId={focusedJobId}
              onSetFilters={handleSetFilters}
              onFocusJob={handleFocusJob}
              compareJobIds={compareJobIds}
              onToggleCompare={handleToggleCompare}
            />
            <CommuterComparePanel
              jobs={jobs}
              compareJobIds={compareJobIds}
            />
          </div>
        </div>
      )}
    </div>
  );
}
