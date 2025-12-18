import React, { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import PipelineColumn from "./PipelineColumn";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import { useNavigate } from "react-router-dom";
import { canMove } from "../../types/jobs.types";
import {
  type Job,
  STATUS_ORDER,
  STATUS_DISPLAY,
  STATUS_COLORS,
  type JobStatus,
} from "../../types/jobs.types";

const JobsPipeline: React.FC = () => {
  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const json = await res.json();

      // Handle both legacy and paginated responses safely
      const jobsArray: Job[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];

      setJobs(jobsArray);

      const analysisPromises = jobsArray.map(async (job) => {
        console.log("Jobs API response:", json);
        console.log("Using jobsArray:", jobsArray);

        if (job._id && (job.matchScore === undefined || job.matchScore === null)) {
          try {
            await fetch(`${API_BASE}/api/jobs/${job._id}/analyze-match`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
          } catch (err) {
            console.warn("Match analysis failed for job:", job._id, err);
          }
        }
      });

      await Promise.all(analysisPromises)
    } catch (error: any) {
      setErr(error.message || "Error fetching jobs");
    } finally {
      setLoading(false);
    }
  };

  function updateJobLocal(id: string, patch: Partial<Job>) {
    setJobs((prev) =>
      prev.map((j) => (j._id === id ? { ...j, ...patch } : j))
    );
  }

  function passesQualityGate(job: Job): boolean {
    if (!job.enforceQualityGate) return true;
    if (job.applicationQualityScore == null) return false;
    return job.applicationQualityScore >= 70;
  }

  const toggleJobSelection = (id: string, selected: boolean) => {
    setSelectedJobs((prev) =>
      selected ? [...prev, id] : prev.filter((jobId) => jobId !== id)
    );
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedJobs.length === 0) {
      alert("Select at least one job and a status to update.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/jobs/bulk-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobIds: selectedJobs,
          status: bulkStatus,
          note: "Bulk status update from pipeline",
        }),
      });

      if (!res.ok) throw new Error("Bulk update failed");
      await fetchJobs();
      setSelectedJobs([]);
      setBulkStatus("");
      alert("✅ Bulk update successful!");
    } catch (err) {
      console.error("Bulk update error:", err);
      alert("Failed to bulk update jobs");
    }
  };

  const groupedJobs: Record<JobStatus, Job[]> = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status);
      return acc;
    },
    {} as Record<JobStatus, Job[]>
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const draggedJobId = active.id;
    const targetStatus = over.id as JobStatus;

    const job = jobs.find((j) => j._id === draggedJobId);
    if (!job) return;

    // 🟡 Do nothing if dropped back into same column
    if (job.status === targetStatus) return;

    // 🛑 Prevent illegal moves (stage skipping or backward moves)
    if (!canMove(job.status, targetStatus)) {
      console.warn(`Blocked illegal move: ${job.status} → ${targetStatus}`);
      return;
    }

    // 🛑 Block movement if quality gate is enforced and score < 70
    if (!passesQualityGate(job)) {
      alert(
        "🚫 Application quality below 70. Improve resume or cover letter before advancing."
      );
      return;
    }

    // 🟢 Optimistic update for smoother UI
    setJobs((prev) =>
      prev.map((j) =>
        j._id === draggedJobId ? { ...j, status: targetStatus } : j
      )
    );

    try {
      await fetch(`${API_BASE}/api/jobs/${draggedJobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error("Failed to update job status:", err);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;

  return (
    <div className="mx-auto max-w-full px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Job Application Pipeline
      </h1>

      {/* ✅ Bulk Update Controls */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">Select status...</option>
          <option value="interested">Interested</option>
          <option value="applied">Applied</option>
          <option value="phone_screen">Phone Screen</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>

        <Button variant="primary" onClick={handleBulkUpdate}>
          Update Selected Jobs
        </Button>

        {selectedJobs.length > 0 && (
          <span className="text-sm text-gray-600">
            {selectedJobs.length} selected
          </span>
        )}
      </div>

      {/* ✅ Pipeline Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {STATUS_ORDER.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              title={STATUS_DISPLAY[status]}
              colorClass={STATUS_COLORS[status]}
              jobs={groupedJobs[status]}
              selectedJobs={selectedJobs}
              toggleJobSelection={toggleJobSelection}
              updateJobLocal={updateJobLocal}
            />
          ))}
        </DndContext>
      </div>

      <Button className="mt-4" onClick={() => navigate("/Jobs")}>
        Back to Jobs
      </Button>
    </div>
  );
};

export default JobsPipeline;