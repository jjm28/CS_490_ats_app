import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import JobStatusNoteModal from "./JobStatusNoteModal";
import API_BASE from "../../utils/apiBase";

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  status: string;
  statusHistory?: { status: string; timestamp: string; note?: string }[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
}

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: job._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const formatSalary = (min?: number | any, max?: number | any) => {
    if (!min && !max) return "Not specified";

    // Handle MongoDB Decimal128 type - convert to number
    const minNum = min?.$numberDecimal
      ? parseFloat(min.$numberDecimal)
      : min
      ? Number(min)
      : null;
    const maxNum = max?.$numberDecimal
      ? parseFloat(max.$numberDecimal)
      : max
      ? Number(max)
      : null;

    if (minNum && maxNum)
      return `$${minNum.toLocaleString()} - $${maxNum.toLocaleString()}`;
    if (minNum) return `$${minNum.toLocaleString()}+`;
    if (maxNum) return `Up to $${maxNum.toLocaleString()}`;
    return "Not specified";
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
        <button
          className="mt-2 text-blue-600 text-xs hover:underline"
          onClick={() => setIsModalOpen(true)}
        >
          {job.statusHistory?.find((h) => h.status === job.status)?.note
            ? "Edit Note"
            : "Add Note"}
        </button>
      </div>

      <JobStatusNoteModal
        isOpen={isModalOpen}
        existingNote={
          job.statusHistory?.find((h) => h.status === job.status)?.note || ""
        }
        onClose={() => setIsModalOpen(false)}
        onSave={(note) => {
          // Call PATCH API to save note for this job status
          fetch(`${API_BASE}}/api/jobs/${job._id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ status: job.status, note }),
          }).then(() => {
            setIsModalOpen(false);
          });
        }}
      />
    </>
  );
};

export default JobCard;
