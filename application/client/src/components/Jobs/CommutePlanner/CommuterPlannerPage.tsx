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
        console.log(data)
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
  setFocusedJobId((current) => (current === id ? null : id));
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

    {/* ---------- TOP HEADER (NO CARD, CENTERED) ---------- */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-semibold">{modeLabel}</h1>
      <p className="text-sm text-gray-600 mt-1">
        Visualize your job locations and plan commute distance and time.
      </p>

      {/* Show All Jobs button (only in single mode) */}
      {mode === "single" && (
        <div className="mt-3">
          <Button variant="outline" onClick={handleShowAllJobs}>
            Show all jobs
          </Button>
        </div>
      )}

      {/* Home location warnings */}
      {home && !home.geo && (
        <div className="mt-4 mx-auto max-w-md text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Your home location isn&apos;t set yet. Add it in your profile to see
          commute distance and time calculations on the map.
        </div>
      )}

      {!home && (
        <div className="mt-4 mx-auto max-w-md text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          We couldn&apos;t find a home location for your profile.
          Add a &quot;Home location&quot; in your profile to enable commute planning.
        </div>
      )}
    </div>

    {/* ---------- LOADING & ERROR STATES ---------- */}
    {loading && <div>Loading commuter planner…</div>}
    {error && !loading && (
      <div className="text-red-600 mb-4 text-center">Error: {error}</div>
    )}

    {/* ---------- MAIN LAYOUT ---------- */}
    {!loading && !error && (
          <>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">

        {/* MAP */}
        <Card className="h-[480px] lg:h-[600px] overflow-hidden">
          <CommuterPlannerMap
            home={home}
            jobs={jobs}
            focusedJobId={focusedJobId}
            onJobFocus={handleFocusJob}
          />
        </Card>

        {/* SIDEBAR + COMPARE PANEL */}
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


        </div>


      </div>   
          <div className="mt-6">
      <CommuterComparePanel
        home={home}
        jobs={jobs}
        compareJobIds={compareJobIds}
      />
    </div>
           {/* ---------- OSM / NOMINATIM ATTRIBUTION ---------- */}
        <div className="mt-4 text-[10px] text-gray-500">
          Map data © OpenStreetMap contributors. Search powered by{" "}
          <a
            href="https://nominatim.openstreetmap.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Nominatim
          </a>.
        </div>
      </>
    )}
  </div>
);

}
