import React from "react";
import JobCard from "./JobCard";
import { useDroppable } from "@dnd-kit/core";
import type { PipelineColumnProps } from "../../types/jobs.types";

interface ColumnProps extends PipelineColumnProps {
  selectedJobs: string[];
  toggleJobSelection: (id: string, selected: boolean) => void;
}

const PipelineColumn: React.FC<ColumnProps> = ({
  status,
  title,
  colorClass,
  jobs,
  selectedJobs,
  toggleJobSelection,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 rounded-lg border border-gray-200 shadow-sm transition-all ${
        isOver ? "bg-gray-200" : "bg-gray-50"
      }`}
      style={{
        minHeight: "400px", // ✅ ensures you can drop even when full
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className={`rounded-t-lg p-2 font-semibold ${colorClass} flex justify-between items-center`}
      >
        <span>{title}</span>
        <span className="text-sm bg-white text-gray-800 px-2 rounded-full">
          {jobs.length}
        </span>
      </div>

      {/* Jobs container */}
      <div
        className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto"
        style={{
          minHeight: "300px", // ✅ extra padding area for reliable drops
        }}
      >
        {jobs.map((job) => (
          <JobCard
            key={job._id}
            job={job}
            selectedJobs={selectedJobs}
            toggleJobSelection={toggleJobSelection}
          />
        ))}
      </div>
    </div>
  );
};

export default PipelineColumn;