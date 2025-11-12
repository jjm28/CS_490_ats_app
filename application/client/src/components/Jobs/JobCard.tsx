import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type JobCardProps, formatSalary } from "../../types/jobs.types";

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: job._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Calculate days in current stage
  const getDaysInStage = () => {
    const hist = (job as any).statusHistory || [];
    if (!hist.length) return 0;
    const latest = [...hist].reverse().find((h: any) => h.status === (job as any).status);
    if (!latest) return 0;
    const diff = Date.now() - new Date(latest.changedAt ?? latest.timestamp).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 rounded shadow cursor-move hover:shadow-md transition-all"
    >
      <div className="font-semibold text-gray-900">{job.jobTitle}</div>
      {(job as any).company && (
        <div className="text-sm text-gray-700">{(job as any).company}</div>
      )}

      {/* Badges */}
      <div className="mt-2 flex flex-wrap gap-2">
        {(job as any).type && (
          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {(job as any).type}
          </span>
        )}
        {(job as any).industry && (
          <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
            {(job as any).industry}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        {(job as any).location && `📍 ${(job as any).location}`}{" "}
        {((job as any).salaryMin || (job as any).salaryMax) && (
          <>
            {" "}| {" "}
            💰 {formatSalary((job as any).salaryMin, (job as any).salaryMax)}
          </>
        )}
      </div>

      {(job as any).jobPostingUrl && (
        <a
          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          href={(job as any).jobPostingUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View posting →
        </a>
      )}

      <div className="text-xs text-gray-500 mt-1">
        🕒 {getDaysInStage()} {getDaysInStage() === 1 ? "day" : "days"} in stage
      </div>
    </div>
  );
};

export default JobCard;