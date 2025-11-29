import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type JobCardProps as BaseJobCardProps, formatSalary } from "../../types/jobs.types";
import { useNavigate } from "react-router-dom";

interface ExtendedJobCardProps extends BaseJobCardProps {
  selectedJobs: string[];
  toggleJobSelection: (jobId: string, selected: boolean) => void;
}

const JobCard: React.FC<ExtendedJobCardProps> = ({
  job,
  selectedJobs,
  toggleJobSelection,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: job._id });
  const navigate = useNavigate();

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
      className={`bg-white p-3 rounded shadow hover:shadow-md transition-all cursor-pointer border ${
        isSelected ? "border-blue-500" : "border-transparent"
      }`}
      onClick={(e) => {
        const target = e.target as HTMLElement;

        // ❌ Don’t navigate when clicking checkbox
        if (target.tagName === "INPUT") return;

        // ❌ Don’t navigate when dragging
        if (target.closest(".drag-handle")) return;

        // ✅ Navigate to job details
        navigate(`/Jobs/${job._id}`, { state: { fromPipeline: true } });
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
    </div>
  );
};

export default JobCard;