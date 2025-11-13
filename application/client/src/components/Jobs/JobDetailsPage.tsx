import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import type { Job } from "../../types/jobs.types";
import InterviewScheduler from "../Jobs/InterviewScheduler";

const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPipeline = location.state?.fromPipeline; // ✅ detect if from pipeline

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load job details");
      const data = await res.json();
      setJob(data);
    } catch (error: any) {
      setErr(error.message || "Error loading job");
    } finally {
      setLoading(false);
    }
  };

  // helper to extract numeric salary values safely
  const parseSalary = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "number") return value.toString();
    if (typeof value === "object" && "$numberDecimal" in value)
      return value.$numberDecimal ?? null;
    return null;
  };

  if (loading) return <p className="p-6">Loading job details...</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;
  if (!job) return <p className="p-6 text-gray-500">Job not found.</p>;

  const salaryMin = parseSalary(job.salaryMin);
  const salaryMax = parseSalary(job.salaryMax);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Button
        variant="secondary"
        onClick={() => (fromPipeline ? navigate("/Applications") : navigate(-1))}
        className="mb-6"
      >
        ← Back
      </Button>

      <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{job.jobTitle}</h1>
        <h2 className="text-xl text-gray-700 mb-6">{job.company}</h2>

        <div className="space-y-3 text-gray-800">
          {job.location && (
            <p>
              <span className="font-semibold">📍 Location:</span> {job.location}
            </p>
          )}
          {job.type && (
            <p>
              <span className="font-semibold">💼 Type:</span> {job.type}
            </p>
          )}
          {job.industry && (
            <p>
              <span className="font-semibold">🏢 Industry:</span> {job.industry}
            </p>
          )}
          {(salaryMin || salaryMax) && (
            <p>
              <span className="font-semibold">💰 Salary:</span>{" "}
              {salaryMin ? `$${salaryMin}` : "?"} -{" "}
              {salaryMax ? `$${salaryMax}` : "?"}
            </p>
          )}
          {job.status && (
            <p>
              <span className="font-semibold">🏷 Status:</span>{" "}
              {job.status.replace("_", " ")}
            </p>
          )}
          {job.applicationDeadline && (
            <p>
              <span className="font-semibold">📅 Deadline:</span>{" "}
              {new Date(job.applicationDeadline).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* ✅ Job Description */}
        {job.description && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Job Description
            </h3>
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {job.description}
            </p>
          </div>
        )}

        {/* ✅ Status History */}
        {job.statusHistory && job.statusHistory.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Status History
            </h3>
            <ul className="space-y-2">
              {job.statusHistory
                .slice()
                .reverse()
                .map((s, i) => (
                  <li
                    key={i}
                    className="flex justify-between bg-gray-50 border rounded p-2 text-sm text-gray-700"
                  >
                    <span className="capitalize">{s.status.replace("_", " ")}</span>
                    <span className="text-gray-500">
                      {new Date(s.timestamp).toLocaleString()}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* ✅ Interview Scheduling Section */}
      <div className="mt-10">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Interview Scheduling
        </h3>
        <InterviewScheduler jobId={job._id} />
      </div>

      <div className="mt-8 flex gap-3">
        {job.jobPostingUrl && (
          <a href={job.jobPostingUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="primary">View Posting →</Button>
          </a>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            navigate(fromPipeline ? "/Applications" : "/Jobs")
          }
        >
          Back to {fromPipeline ? "Applications" : "Jobs"}
        </Button>
      </div>
    </div>
  );
};

export default JobDetailsPage;