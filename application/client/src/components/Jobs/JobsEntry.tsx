import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";
import JobDetails from "./JobDetails";
import DeadlineIndicator from "./DeadlineIndicator";
import ExtendDeadlineModal from "./ExtendDeadlineModal";
import { toggleArchiveJob } from "../../api/jobs";
import { useToast } from "../../hooks/useToast";
import { type Job, formatSalary } from "../../types/jobs.types";
import JobForm from "./JobForm";

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

type ExtendedJob = Job & {
  autoArchiveDays?: number;
  createdAt?: string;
  industry?: string;
  type?: string;
  jobPostingUrl?: string;
  applicationDeadline?: string;
};

const STATUS_FILTERS = [
  { label: "All", value: "All" },
  { label: "Interested", value: "interested" },
  { label: "Applied", value: "applied" },
  { label: "Phone screen", value: "phone_screen" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
];

function JobsEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, Toast } = useToast();

  const [jobs, setJobs] = useState<ExtendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [extendingJob, setExtendingJob] = useState<ExtendedJob | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingJob, setEditingJob] = useState<ExtendedJob | null>(null);

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );
  const isLoggedIn = !!token;

  // ===============================
  // FETCH JOBS
  // ===============================
  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const url =
        statusFilter !== "All"
          ? `${JOBS_ENDPOINT}?status=${encodeURIComponent(statusFilter)}`
          : JOBS_ENDPOINT;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", {
          state: { flash: "Your session has expired. Please log in again." },
        });
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      setErr(error?.message || "Failed to load job opportunities.");
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { flash: "Please log in to access job opportunities." },
      });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, statusFilter]);

  // ===============================
  // UTILITIES
  // ===============================
  const getDaysRemaining = (job: ExtendedJob) => {
    if (!job.createdAt) return 0;
    const days = job.autoArchiveDays ?? 60;
    const created = new Date(job.createdAt);
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(days - elapsed, 0);
  };

  // ===============================
  // ACTIONS
  // ===============================
  const openCreate = () => {
    setFormMode("create");
    setEditingJob(null);
    setShowForm(true);
  };

  const openEdit = (job: ExtendedJob) => {
    setFormMode("edit");
    setEditingJob(job);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    try {
      const res = await fetch(`${JOBS_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchJobs();
        setFlash("Job deleted.");
      } else setErr("Failed to delete job");
    } catch (err) {
      console.error("Delete error:", err);
      setErr("Failed to delete job");
    }
  };

  const bulkArchive = async () => {
    if (selectedJobs.length === 0) return;
    if (!confirm(`Archive ${selectedJobs.length} selected job(s)?`)) return;

    await Promise.all(
      selectedJobs.map((id) => toggleArchiveJob(id, true, "Bulk archive"))
    );
    setSelectedJobs([]);
    await fetchJobs();
    showToast("Selected jobs archived.");
  };

  // ===============================
  // RENDER
  // ===============================
  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Job Opportunities</h1>

        {/* Add Job button only (wider, single line) */}
        <Button className="!px-5 !py-2 whitespace-nowrap" onClick={openCreate}>
          + Add Job
        </Button>
      </div>


      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {jobs.length === 0 ? (
        <Card>No jobs found for this filter.</Card>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Card className="transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedJobs.includes(job._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedJobs((prev) =>
                            checked
                              ? [...prev, job._id]
                              : prev.filter((id) => id !== job._id)
                          );
                        }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {job.jobTitle}
                        </div>
                        {job.company && (
                          <div className="text-sm text-gray-700 mt-0.5">
                            {job.company}
                          </div>
                        )}

                        {/* Badges */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {job.type && (
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {job.type}
                            </span>
                          )}
                          {job.industry && (
                            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {job.industry}
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {job.location && <div>📍 {job.location}</div>}
                          <div>
                            💰 {formatSalary((job as any).salaryMin, (job as any).salaryMax)}
                          </div>

                          {/* Deadline + urgency */}
                          <DeadlineIndicator
                            applicationDeadline={job.applicationDeadline}
                            showFullDate={true}
                            size="sm"
                          />

                          {/* Auto-archive countdown */}
                          <span
                            className={`text-sm ${getDaysRemaining(job) <= 10
                              ? "text-red-600"
                              : getDaysRemaining(job) <= 30
                                ? "text-orange-500"
                                : "text-green-600"
                              }`}
                          >
                            ⏳ Auto-archives in {getDaysRemaining(job)} days
                          </span>
                        </div>

                        {/* Posting link */}
                        {job.jobPostingUrl && (
                          <a
                            href={job.jobPostingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View posting →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openEdit(job)}>Edit</Button>

                    <Button
                      variant="secondary"
                      onClick={() => setSelectedJobId(job._id)}
                    >
                      View Details
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const reason = prompt("Archive reason?");
                        await toggleArchiveJob(job._id, true, reason || "Manual archive");
                        setJobs((prev) => prev.filter((j) => j._id !== job._id));

                        showToast("Job archived", {
                          actionLabel: "Undo",
                          onAction: async () => {
                            await toggleArchiveJob(job._id, false, "Undo archive");
                            await fetchJobs();
                          },
                        });

                      }}
                    >
                      Archive
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleDelete(job._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 mt-6 justify-between">
        {/* Left group: Archived + Bulk Archive */}
        <div className="flex gap-2">
          <Button onClick={() => navigate("/Jobs/Archived")}>
            View Archived Jobs
          </Button>
          <Button
            variant="secondary"
            className="!px-5 !py-2 whitespace-nowrap"
            disabled={selectedJobs.length === 0}
            onClick={bulkArchive}
            title="Archive selected"
          >
            Bulk Archive
            {selectedJobs.length > 0 && ` (${selectedJobs.length})`}
          </Button>
        </div>

        {/* Right group: Pipeline + Stats */}
        <div className="flex gap-2">
          <Button onClick={() => navigate("/Jobs/Pipeline")}>View Pipeline</Button>
          <Button onClick={() => navigate("/Jobs/Stats")}>View Statistics</Button>
        </div>
      </div>


      {/* Details Drawer/Modal */}
      {selectedJobId && (
        <JobDetails
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={fetchJobs}
        />
      )}

      {/* Extend Deadline Modal (unchanged usage) */}
      {extendingJob && (
        <ExtendDeadlineModal
          job={extendingJob as any}
          onClose={() => setExtendingJob(null)}
          onExtend={async () => {
            await fetchJobs();
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <JobForm
          mode={formMode}
          token={token}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            setEditingJob(null);
            await fetchJobs();
          }}
          initial={editingJob ?? undefined}
        />
      )}

      <Toast />
    </div>
  );
}

export default JobsEntry;