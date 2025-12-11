// src/components/Teams/TeamJobSuggestions.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import {
  getTeamJobSuggestions,
  createTeamJobSuggestionApi,
  setTeamJobStatusApi,
  removeTeamJobSuggestionApi,
} from "../../api/teams";
import type {
  TeamJobSuggestion,
  CreateTeamJobPayload,
} from "../../api/teams";

interface TeamJobSuggestionsProps {
  teamId: string;
  viewerRoles: string[]; // e.g. ["admin"] | ["mentor"] | ["candidate"]
}

const emptyNewJob: CreateTeamJobPayload = {
  title: "",
  company: "",
  deadline: "",
  description: "",
  location: "",
  link: "",
};

const TeamJobSuggestions: React.FC<TeamJobSuggestionsProps> = ({
  teamId,
  viewerRoles,
}) => {
  const [jobs, setJobs] = useState<TeamJobSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newJob, setNewJob] = useState<CreateTeamJobPayload>(emptyNewJob);
  const [creating, setCreating] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const isCoach = useMemo(
    () => viewerRoles.some((r) => r === "admin" || r === "mentor"),
    [viewerRoles]
  );

  const isCandidate = useMemo(
    () => viewerRoles.includes("candidate"),
    [viewerRoles]
  );

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTeamJobSuggestions(teamId);
      setJobs(data);
    } catch (err: any) {
      console.error("Failed to load team job suggestions:", err);
      setError(
        err?.message || "Failed to load job suggestions for this team."
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    // Initial load
    void loadJobs();

    // Simple polling so coaches see updates without manual refresh
    const id = window.setInterval(() => {
      void loadJobs();
    }, 30000); // 30s

    return () => window.clearInterval(id);
  }, [loadJobs]);

  const handleNewJobChange = (
    field: keyof CreateTeamJobPayload,
    value: string
  ) => {
    setNewJob((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newJob.title.trim() || !newJob.company.trim() || !newJob.deadline) {
      alert("Title, company, and deadline are required.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const created = await createTeamJobSuggestionApi(teamId, newJob);
      setNewJob(emptyNewJob);
      setJobs((prev) => [created, ...prev]);
    } catch (err: any) {
      console.error("Failed to create team job suggestion:", err);
      setError(err?.message || "Failed to create job suggestion.");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (
    jobId: string,
    status: "applied" | "not_interested" | "clear"
  ) => {
    try {
      setBusyJobId(jobId);
      setError(null);
      await setTeamJobStatusApi(teamId, jobId, status);
      // Reload to get fresh metrics + applied names for coaches
      await loadJobs();
    } catch (err: any) {
      console.error("Failed to update job status:", err);
      setError(err?.message || "Failed to update job status.");
    } finally {
      setBusyJobId(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Remove this job for all team members?")) return;
    try {
      setBusyJobId(jobId);
      setError(null);
      await removeTeamJobSuggestionApi(teamId, jobId);
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
    } catch (err: any) {
      console.error("Failed to delete job suggestion:", err);
      setError(err?.message || "Failed to delete job suggestion.");
    } finally {
      setBusyJobId(null);
    }
  };

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return deadline;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const currentUserStatusFor = (job: TeamJobSuggestion) =>
    job.myStatus ?? null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Coach-only: New job form */}
      {isCoach && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Create Job Suggestion</h3>
          <form
            onSubmit={handleCreateJob}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Position Title*
              </label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm"
                value={newJob.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNewJobChange("title", e.target.value)
                }
                placeholder="Software Engineer Intern"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Company*
              </label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm"
                value={newJob.company}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNewJobChange("company", e.target.value)
                }
                placeholder="Example Corp"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Application Deadline*
              </label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={newJob.deadline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNewJobChange("deadline", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Location (optional)
              </label>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm"
                value={newJob.location || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNewJobChange("location", e.target.value)
                }
                placeholder="New York, NY or Remote"
              />
            </div>

            <div className="md:col-span-2 flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Application Link (optional)
              </label>
              <input
                type="url"
                className="border rounded px-2 py-1 text-sm"
                value={newJob.link || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNewJobChange("link", e.target.value)
                }
                placeholder="https://company.com/careers/job"
              />
            </div>

            <div className="md:col-span-2 flex flex-col space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Job Description
              </label>
              <textarea
                className="border rounded px-2 py-1 text-sm min-h-[80px]"
                value={newJob.description || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleNewJobChange("description", e.target.value)
                }
                placeholder="Brief summary of responsibilities, requirements, etc."
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Error + status */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Jobs list */}
      <div className="flex-1 min-h-0">
        {loading && jobs.length === 0 ? (
          <p className="text-sm text-gray-500">Loading job suggestions…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active job suggestions yet.
            {isCoach ? " Post one above to get started." : ""}
          </p>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {jobs.map((job) => {
              const myStatus = currentUserStatusFor(job);
              const isBusy = busyJobId === job._id;

              return (
                <Card
                  key={job._id}
                  className="p-3 hover:border-blue-500 transition-colors"
                >
                  {/* Clickable wrapper INSIDE the card */}
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === job._id ? null : job._id
                      )
                    }
                  >
                    {/* Summary row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold">
                          {job.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {job.company}
                        </div>
                        <div className="text-xs text-gray-500">
                          Deadline: {formatDeadline(job.deadline)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* Status pill for current user */}
                        {myStatus && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              myStatus === "applied"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {myStatus === "applied"
                              ? "Applied"
                              : "Not interested"}
                          </span>
                        )}

                        {/* Coach metrics */}
                        {job.metrics && isCoach && (
                          <span className="text-[11px] text-gray-500">
                            {job.metrics.appliedCount} applied ·{" "}
                            {job.metrics.notInterestedCount} not interested
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedId === job._id && (
                      <div className="mt-3 space-y-2 text-xs text-gray-700">
                        {job.location && (
                          <div>
                            <span className="font-medium">Location: </span>
                            <span>{job.location}</span>
                          </div>
                        )}

                        {job.link && (
                          <div>
                            <span className="font-medium">
                              Application Link:{" "}
                            </span>
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                              onClick={(
                                e: React.MouseEvent<HTMLAnchorElement>
                              ) => e.stopPropagation()}
                            >
                              Open posting
                            </a>
                          </div>
                        )}

                        {job.description && (
                          <div>
                            <span className="font-medium">Description:</span>
                            <p className="mt-1 whitespace-pre-line">
                              {job.description}
                            </p>
                          </div>
                        )}

                        {job.createdByName && (
                          <div className="text-[11px] text-gray-500">
                            Shared by {job.createdByName}
                          </div>
                        )}

                        {/* Candidate actions */}
                        {isCandidate && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button
                              disabled={isBusy}
                              className="px-3 py-1 text-xs"
                              onClick={(
                                e: React.MouseEvent<HTMLButtonElement>
                              ) => {
                                e.stopPropagation();
                                void handleStatusChange(job._id, "applied");
                              }}
                            >
                              I applied
                            </Button>
                            <Button
                              disabled={isBusy}
                              variant="secondary"
                              className="px-3 py-1 text-xs"
                              onClick={(
                                e: React.MouseEvent<HTMLButtonElement>
                              ) => {
                                e.stopPropagation();
                                void handleStatusChange(
                                  job._id,
                                  "not_interested"
                                );
                              }}
                            >
                              Not interested
                            </Button>
                            {myStatus && (
                              <Button
                                disabled={isBusy}
                                variant="secondary"
                                className="px-3 py-1 text-xs"
                                onClick={(
                                  e: React.MouseEvent<HTMLButtonElement>
                                ) => {
                                  e.stopPropagation();
                                  void handleStatusChange(job._id, "clear");
                                }}
                              >
                                Clear response
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Coach-only: see list of applied candidates + delete */}
                        {isCoach && (
                          <div className="mt-2 space-y-2">
                            {job.appliedCandidates &&
                              job.appliedCandidates.length > 0 && (
                                <div>
                                  <div className="font-medium text-xs mb-1">
                                    Candidates who applied:
                                  </div>
                                  <ul className="text-[11px] list-disc list-inside space-y-0.5">
                                    {job.appliedCandidates.map((c) => (
                                      <li key={c.userId}>
                                        {c.name || c.email || c.userId}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            <div className="flex justify-end">
                              <Button
                                disabled={isBusy}
                                variant="secondary"
                                className="px-3 py-1 text-xs text-red-600 border border-red-200 hover:bg-red-50"
                                onClick={(
                                  e: React.MouseEvent<HTMLButtonElement>
                                ) => {
                                  e.stopPropagation();
                                  void handleDeleteJob(job._id);
                                }}
                              >
                                Remove job
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamJobSuggestions;
