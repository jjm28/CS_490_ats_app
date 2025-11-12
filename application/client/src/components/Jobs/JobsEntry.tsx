import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";
import JobDetails from "./JobDetails";
import {
  type Job,
  formatSalary,
} from "../../types/jobs.types";
import DeadlineIndicator from "./DeadlineIndicator";
import { getDeadlineInfo } from "../../utils/deadlines";
import ExtendDeadlineModal from "./ExtendDeadlineModal";
import { toggleArchiveJob } from "../../api/jobs";

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

type SortOption = "dateAdded" | "deadline" | "deadlineUrgency" | "salary" | "company";

function JobsEntry() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [extendingJob, setExtendingJob] = useState<Job | null>(null);

  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  // --- helper to handle Mongo decimals safely ---
  const getDecimalValue = (
    val: number | { $numberDecimal?: string } | null | undefined
  ): number => {
    if (typeof val === "object" && val !== null && "$numberDecimal" in val) {
      return parseFloat(val.$numberDecimal ?? "0");
    }
    return Number(val) || 0;
  };

  // ===============================
  // JOB FETCHING
  // ===============================
  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const response = await fetch(JOBS_ENDPOINT, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", {
          state: { flash: "Your session has expired. Please log in again." },
        });
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      setErr(error?.message || "Failed to load job opportunities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchJobs();
  }, [isLoggedIn]);

  // ===============================
  // FILTERS + SORTING
  // ===============================
  const [searchQuery] = useState("");
  const [sortBy] = useState<SortOption>("dateAdded");

  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.jobTitle.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case "deadline":
          return (
            new Date(a.applicationDeadline || 0).getTime() -
            new Date(b.applicationDeadline || 0).getTime()
          );
        case "salary":
          return (
            getDecimalValue(b.salaryMax) - getDecimalValue(a.salaryMax)
          );
        case "company":
          return a.company.localeCompare(b.company);
        case "deadlineUrgency":
          const order: Record<string, number> = {
            overdue: 0,
            critical: 1,
            warning: 2,
            normal: 3,
            plenty: 4,
            none: 5,
          };
          const aInfo = getDeadlineInfo(a.applicationDeadline);
          const bInfo = getDeadlineInfo(b.applicationDeadline);
          return order[aInfo.urgency] - order[bInfo.urgency];
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, sortBy]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (loading) return <p className="p-6">Loading...</p>;

  // ===============================
  // MAIN RETURN
  // ===============================
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Opportunities</h1>
      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {/* Jobs List */}
      {filteredAndSortedJobs.length === 0 ? (
        <Card>No jobs match your current filters.</Card>
      ) : (
        <ul className="space-y-3">
          {filteredAndSortedJobs.map((job) => (
            <li key={job._id}>
              <Card
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedJobId(job._id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {highlightText(job.jobTitle, searchQuery)}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {highlightText(job.company, searchQuery)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {job.location && <div>📍 {job.location}</div>}
                      <div>💰 {formatSalary(job.salaryMin, job.salaryMax)}</div>
                      <DeadlineIndicator
                        applicationDeadline={job.applicationDeadline}
                        showFullDate={true}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        toggleArchiveJob(
                          job._id,
                          true,
                          "User manually archived"
                        ).then(() => {
                          setJobs((prev) => prev.filter((j) => j._id !== job._id));
                          setFlash("Job archived successfully!");
                          setTimeout(() => setFlash(null), 3000);
                        });
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
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Buttons */}
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
          onExtend={async () => { await fetchJobs(); }}
        />
      )}
    </div>
  );
}

export default JobsEntry;