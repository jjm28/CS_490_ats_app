import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type JobCardProps, formatSalary } from "../../types/jobs.types";

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: job._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Calculate days in current stage
  const getDaysInStage = () => {
    if (!job.statusHistory || job.statusHistory.length === 0) return 0;
    const latest = [...job.statusHistory]
      .reverse()
      .find((h) => h.status === job.status);
    if (!latest) return 0;
    const diff = new Date().getTime() - new Date(latest.timestamp).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white p-3 rounded shadow cursor-move hover:shadow-md transition-all"
      >
        <div className="font-semibold text-gray-900">{job.jobTitle}</div>
        <div className="text-sm text-gray-700">{job.company}</div>
        <div className="text-xs text-gray-500 mt-1">
          {job.location && `📍 ${job.location}`} | 💰{" "}
          {formatSalary(job.salaryMin, job.salaryMax)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          🕒 {getDaysInStage()} {getDaysInStage() === 1 ? "day" : "days"} in
          stage
        </div>
      </div>
    </>
  );
};

export default JobCard;