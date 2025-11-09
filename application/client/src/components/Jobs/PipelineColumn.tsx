import React from "react";
import JobCard from "./JobCard";
import { useDroppable } from "@dnd-kit/core";

// Types
interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  status: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
}

interface PipelineColumnProps {
  status: string;
  title: string;
  colorClass: string;
  jobs: Job[];
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ status, title, colorClass, jobs }) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className="w-72 flex-shrink-0">
      <div className={`rounded-t-lg p-2 font-semibold ${colorClass} flex justify-between`}>
        <span>{title}</span>
        <span className="text-sm bg-white px-2 rounded-full">{jobs.length}</span>
      </div>
      <div
        className={`bg-gray-50 rounded-b-lg p-2 min-h-[100px] space-y-2 ${
          isOver ? "bg-gray-200" : ""
        }`}
      >
        {jobs.map((job) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>
    </div>
  );
};

export default PipelineColumn;
