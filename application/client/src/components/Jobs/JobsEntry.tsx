import React, { useState, useEffect, useMemo } from "react";
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

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

function JobsEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, Toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [extendingJob, setExtendingJob] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    jobTitle: "",
    company: "",
    industry: "",
    type: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    jobPostingUrl: "",
    applicationDeadline: "",
    description: "",
    autoArchiveDays: "60",
  });

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
      const res = await fetch(JOBS_ENDPOINT, {
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

  // ===============================
  // EFFECTS
  // ===============================
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
  }, [isLoggedIn]);

  // ===============================
  // UTILITIES
  // ===============================
  const getDaysRemaining = (job: Job) => {
    if (!job.createdAt) return 0;
    const days = job.autoArchiveDays || 60;
    const created = new Date(job.createdAt);
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(days - elapsed, 0);
  };

  // ===============================
  // FORM HANDLERS
  // ===============================
  const validateField = (
    name: string,
    value: string,
    otherSalaryValue?: string
  ) => {
    let error = "";
    switch (name) {
      case "jobTitle":
        if (!value.trim()) error = "Job title is required";
        break;
      case "company":
        if (!value.trim()) error = "Company name is required";
        break;
      case "salaryMin":
      case "salaryMax":
        if (value && parseFloat(value) < 0)
          error = "Salary must be a positive number";
        break;
    }
    return error;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(
      name,
      value,
      name === "salaryMin" ? formData.salaryMax : formData.salaryMin
    );
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) newErrors[name] = error;
      else delete newErrors[name];
      return newErrors;
    });
  };

  const resetForm = () => {
    setFormData({
      jobTitle: "",
      company: "",
      industry: "",
      type: "",
      location: "",
      salaryMin: "",
      salaryMax: "",
      jobPostingUrl: "",
      applicationDeadline: "",
      description: "",
      autoArchiveDays: "60",
    });
    setErrors({});
    setEditingJob(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const payload: any = {
      jobTitle: formData.jobTitle,
      company: formData.company,
      industry: formData.industry,
      type: formData.type,
      location: formData.location,
      salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
      salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
      jobPostingUrl: formData.jobPostingUrl,
      description: formData.description,
      autoArchiveDays: parseInt(formData.autoArchiveDays) || 60,
    };
    if (formData.applicationDeadline)
      payload.applicationDeadline = new Date(formData.applicationDeadline).toISOString();

    try {
      const url = editingJob
        ? `${JOBS_ENDPOINT}/${editingJob._id}`
        : JOBS_ENDPOINT;
      const method = editingJob ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchJobs();
        setFlash(editingJob ? "Job updated!" : "Job added!");
        resetForm();
      } else {
        setErr(data.message || "Error saving job.");
      }
    } catch (error) {
      console.error("Save error:", error);
      setErr("Failed to save job.");
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      jobTitle: job.jobTitle,
      company: job.company || "",
      industry: job.industry,
      type: job.type,
      location: job.location || "",
      salaryMin: job.salaryMin ? job.salaryMin.toString() : "",
      salaryMax: job.salaryMax ? job.salaryMax.toString() : "",
      jobPostingUrl: job.jobPostingUrl || "",
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split("T")[0]
        : "",
      description: job.description || "",
      autoArchiveDays: job.autoArchiveDays
        ? String(job.autoArchiveDays)
        : "60",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
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
        setFlash("Job deleted successfully!");
      } else setErr("Failed to delete job");
    } catch (err) {
      console.error("Delete error:", err);
      setErr("Failed to delete job");
    }
  };

  // ===============================
  // RENDER
  // ===============================
  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Opportunities</h1>
      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                placeholder="Job Title"
                className="form-input"
              />
              <input
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Company"
                className="form-input"
              />
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Location"
                className="form-input"
              />
              <input
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleInputChange}
                placeholder="Salary Min"
                className="form-input"
              />
              <input
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleInputChange}
                placeholder="Salary Max"
                className="form-input"
              />
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              className="form-input"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingJob ? "Update" : "Save"} Job
              </Button>
            </div>
          </form>
        </Card>
      )}

      {jobs.length === 0 ? (
        <Card>No jobs available.</Card>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Card className="cursor-pointer hover:opacity-90 transition-opacity">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {job.jobTitle}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {job.company}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {job.location && <div>📍 {job.location}</div>}
                      <div>💰 {formatSalary(job.salaryMin, job.salaryMax)}</div>
                      <DeadlineIndicator
                        applicationDeadline={job.applicationDeadline}
                        showFullDate={true}
                        size="sm"
                      />
                      <div
                        className={`text-sm ${getDaysRemaining(job) <= 10
                          ? "text-red-600"
                          : getDaysRemaining(job) <= 30
                            ? "text-orange-500"
                            : "text-green-600"
                          }`}
                      >
                        ⏳ Auto-archives in {getDaysRemaining(job)} days
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        const reason = prompt(
                          "Enter reason for archiving this job:"
                        );
                        await toggleArchiveJob(
                          job._id,
                          true,
                          reason || "Manual archive"
                        );
                        setJobs((prev) => prev.filter((j) => j._id !== job._id));
                        showToast("Job archived");
                      }}
                    >
                      Archive
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/jobs/${job._id}`)}
                    >
                      View Details
                    </Button>
                    <Button onClick={() => handleEdit(job)}>Edit</Button>
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

      <div className="flex gap-2 mt-6 justify-between">
        <Button onClick={() => navigate("/Jobs/Archived")}>
          View Archived Jobs
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/Jobs/Pipeline")}>
            View Pipeline
          </Button>
          <Button onClick={() => navigate("/Jobs/Stats")}>
            View Statistics
          </Button>
        </div>
      </div>

      {selectedJobId && (
        <JobDetails
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={fetchJobs}
        />
      )}

      {extendingJob && (
        <ExtendDeadlineModal
          job={extendingJob}
          onClose={() => setExtendingJob(null)}
          onExtend={async () => {
            await fetchJobs();
          }}
        />
      )}
      <Toast />
    </div>
  );
}

export default JobsEntry;