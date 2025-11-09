import React, { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import PipelineColumn from "./PipelineColumn";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import { useNavigate } from "react-router-dom";

// Types
interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  status:
    | "interested"
    | "applied"
    | "phone_screen"
    | "interview"
    | "offer"
    | "rejected";
  statusHistory?: Array<{ status: string; timestamp: string; note?: string }>;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_ORDER = [
  "interested",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
] as const;

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  interested: "Interested",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  interested: "bg-gray-100 text-gray-800",
  applied: "bg-blue-100 text-blue-800",
  phone_screen: "bg-purple-100 text-purple-800",
  interview: "bg-yellow-100 text-yellow-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const JobsPipeline: React.FC = () => {
  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Fetch jobs
  useEffect(() => {
    fetchJobs();
  }, []);

  const navigate = useNavigate();

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
      const data: Job[] = await res.json();
      setJobs(data);
    } catch (error: any) {
      setErr(error.message || "Error fetching jobs");
    } finally {
      setLoading(false);
    }
  };

  const groupedJobs: Record<string, Job[]> = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status);
      return acc;
    },
    {} as Record<string, Job[]>
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const draggedJobId = active.id;
    const targetStatus = over.id; // the status of the column you dropped into

    const job = jobs.find((j) => j._id === draggedJobId);
    if (!job || job.status === targetStatus) return;

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j._id === draggedJobId ? { ...j, status: targetStatus } : j
      )
    );

    // Update backend
    try {
      await fetch(`${API_BASE}/api/jobs/${draggedJobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error("Failed to update job status:", err);
      // Optionally revert UI if API fails
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;

  return (
    <div className="mx-auto max-w-full px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Job Application Pipeline
      </h1>
      <div className="flex gap-4 overflow-x-auto pb-6">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {STATUS_ORDER.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              title={STATUS_LABELS[status]}
              colorClass={STATUS_COLORS[status]}
              jobs={groupedJobs[status]}
            />
          ))}
        </DndContext>
      </div>
      <Button className="mt-4" onClick={() => navigate("/Jobs")}>Back to Jobs</Button>
    </div>
  );
};

export default JobsPipeline;
