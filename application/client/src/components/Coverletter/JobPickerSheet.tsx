// src/components/JobPickerSheet.tsx
import React, { useMemo } from "react";
import type { Job } from "./hooks/useJobs";

function formatSalary(min?: any, max?: any) {
  const toNum = (v: any) =>
    v?.$numberDecimal ? parseFloat(v.$numberDecimal) : (v !== undefined && v !== null ? Number(v) : null);
  const minNum = toNum(min);
  const maxNum = toNum(max);
  if (minNum && maxNum) return `$${minNum.toLocaleString()} - $${maxNum.toLocaleString()}`;
  if (minNum) return `$${minNum.toLocaleString()}+`;
  if (maxNum) return `Up to $${maxNum.toLocaleString()}`;
  return "Not specified";
}

export default function JobPickerSheet({
  open,
  onClose,
  jobs,
  loading,
  error,
  onPickJob,
  onEnterManual,
   title = "Pick a job for AI to use",
  subtitle = "Choose an existing opportunity or enter the job details manually.",
}: {
  open: boolean;
  onClose: () => void;
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onPickJob: (job: Job) => void;
  onEnterManual: () => void;
    title?: string;
  subtitle?: string;
}) {
  const hasJobs = useMemo(() => jobs && jobs.length > 0, [jobs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full md:w-[720px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">{subtitle}</p>


        {loading && <div className="text-sm text-gray-600">Loading jobs…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {hasJobs ? (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job._id}>
                <button
                  className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  onClick={() => onPickJob(job)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{job.jobTitle}</div>
                      <div className="text-sm text-gray-700 font-medium">{job.company}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {job.location ? `📍 ${job.location}` : "📍 Not specified"} · 💰 {formatSalary(job.salaryMin, job.salaryMax)}
                      </div>
                      {job.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-800 text-xs px-2 py-1">
                        Select
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !loading && (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
              You don’t have any jobs yet.
            </div>
          )
        )}

        <div className="mt-5 flex flex-col md:flex-row gap-3">
          <button
            onClick={onEnterManual}
            className="w-full md:w-auto rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50"
          >
            Enter job manually
          </button>
          <button
            onClick={onClose}
            className="w-full md:w-auto rounded-lg bg-gray-900 text-white px-4 py-2 hover:bg-black"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
