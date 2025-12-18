import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type JobCardProps as BaseJobCardProps,
  formatSalary,
} from "../../types/jobs.types";
import type { Job } from "../../types/jobs.types";
import { useNavigate, useLocation } from "react-router-dom";

interface ExtendedJobCardProps extends BaseJobCardProps {
  selectedJobs: string[];
  toggleJobSelection: (jobId: string, selected: boolean) => void;
  updateJobLocal: (id: string, patch: Partial<Job>) => void;
}

const JobCard: React.FC<ExtendedJobCardProps> = ({
  job,
  selectedJobs,
  toggleJobSelection,
  updateJobLocal,
}) => {
  const qualityScore = job.applicationQualityScore ?? null;
  const isGateEnabled = job.enforceQualityGate ?? false;
  const isBelowThreshold =
    isGateEnabled && qualityScore !== null && qualityScore < 70;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: job._id,
      disabled: isBelowThreshold,
    });

  const navigate = useNavigate();
  const location = useLocation();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getDaysInStage = () => {
    if (!job.statusHistory || job.statusHistory.length === 0) return 0;
    const latest = [...job.statusHistory]
      .reverse()
      .find((h) => h.status === job.status);
    if (!latest) return 0;
    const diff = new Date().getTime() - new Date(latest.timestamp).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const isSelected = selectedJobs.includes(job._id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-3 rounded shadow transition-all border
  ${isBelowThreshold ? "opacity-60 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}
  ${isSelected ? "border-blue-500" : "border-transparent"}
`}
      onClick={(e) => {
        const target = e.target as HTMLElement;

        if (target.tagName === "INPUT") return;
        if (target.closest(".drag-handle")) return;

        navigate(`/Jobs/${job._id}`, {
          state: { from: location.pathname },
        });
      }}
    >
      <div className="flex items-center justify-between">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => toggleJobSelection(job._id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="mr-2 accent-blue-500 cursor-pointer"
        />

        <div
          {...attributes}
          {...listeners}
          className="drag-handle text-gray-400 text-xs mb-1 cursor-grab active:cursor-grabbing select-none"
        >
          ☰
        </div>
      </div>

      <div className="font-semibold text-gray-900">{job.jobTitle}</div>
      <div className="text-sm text-gray-700">{job.company}</div>
      <div className="text-xs text-gray-500 mt-1">
        {job.location && `📍 ${job.location}`} | 💰{" "}
        {formatSalary(job.salaryMin, job.salaryMax)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        🕒 {getDaysInStage()} {getDaysInStage() === 1 ? "day" : "days"} in stage
      </div>
      {qualityScore !== null && (
        <div className="mt-2 text-xs flex items-center justify-between gap-2">
          <span
            className={`font-medium ${qualityScore >= 70 ? "text-green-600" : "text-red-600"
              }`}
          >
            Quality: {qualityScore}/100
          </span>

          <label
            className="flex items-center gap-1 text-gray-500"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isGateEnabled}
              onChange={async (e) => {
                e.stopPropagation();
                const checked = e.target.checked;

                // ✅ Update UI immediately
                updateJobLocal(job._id, { enforceQualityGate: checked });

                const token =
                  localStorage.getItem("authToken") ||
                  localStorage.getItem("token");

                await fetch(
                  `${process.env.REACT_APP_API_BASE}/api/jobs/${job._id}/quality-gate`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ enforceQualityGate: checked }),
                  }
                );
              }}
            />
            Enforce gate (dev)
          </label>
        </div>
      )}
    </div>
  );
};

export default JobCard;