import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { type Job } from "../../types/jobs.types";
import { getDeadlineInfo } from "../../utils/deadlines";
import DeadlineIndicator from "./DeadlineIndicator";
import API_BASE from "../../utils/apiBase";

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

type ViewMode = "month" | "week";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  jobs: Job[];
}

function DeadlineCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await fetch(JOBS_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setJobs(data);
        }
      } catch (error) {
        console.error("Failed to load jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [token]);

  // Filter to only jobs with deadlines
  const jobsWithDeadlines = useMemo(() => {
    return jobs.filter((job) => job.applicationDeadline);
  }, [jobs]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    if (viewMode !== "month") return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the previous Sunday
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on the next Saturday
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: CalendarDay[] = [];
    const currentDay = new Date(startDate);

    while (currentDay <= endDate) {
      const dayJobs = jobsWithDeadlines.filter((job) => {
        if (!job.applicationDeadline) return false;
        const jobDate = new Date(job.applicationDeadline);
        return (
          jobDate.getFullYear() === currentDay.getFullYear() &&
          jobDate.getMonth() === currentDay.getMonth() &&
          jobDate.getDate() === currentDay.getDate()
        );
      });

      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        jobs: dayJobs,
      });

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  }, [currentDate, viewMode, jobsWithDeadlines]);

  // Generate week view days
  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];

    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const dayJobs = jobsWithDeadlines.filter((job) => {
        if (!job.applicationDeadline) return false;
        const jobDate = new Date(job.applicationDeadline);
        return (
          jobDate.getFullYear() === day.getFullYear() &&
          jobDate.getMonth() === day.getMonth() &&
          jobDate.getDate() === day.getDate()
        );
      });

      days.push({
        date: day,
        isCurrentMonth: true,
        jobs: dayJobs,
      });
    }

    return days;
  }, [currentDate, viewMode, jobsWithDeadlines]);

  const displayDays = viewMode === "month" ? calendarDays : weekDays;

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year display
  const displayTitle = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      } else {
        return `${startOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${endOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
    }
  }, [currentDate, viewMode]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Application Deadlines Calendar
        </h1>
        <p className="text-gray-600">
          View all your job application deadlines in a calendar format
        </p>
      </div>

      {/* Calendar Controls */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={goToPrevious}>
              ← {viewMode === "month" ? "Previous Month" : "Previous Week"}
            </Button>
            <Button variant="secondary" onClick={goToToday}>
              Today
            </Button>
            <Button variant="secondary" onClick={goToNext}>
              {viewMode === "month" ? "Next Month" : "Next Week"} →
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {displayTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "month" ? "primary" : "secondary"}
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "primary" : "secondary"}
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Due in 0-3 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Due in 4-7 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Due in 8-14 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>15+ days</span>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden mb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {displayDays.map((day, index) => {
            const today = isToday(day.date);
            const hasJobs = day.jobs.length > 0;

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b p-2 ${
                  !day.isCurrentMonth ? "bg-gray-50" : "bg-white"
                } ${today ? "ring-2 ring-blue-500 ring-inset" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${
                    today
                      ? "text-blue-600 font-bold"
                      : day.isCurrentMonth
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {day.date.getDate()}
                  {today && (
                    <span className="ml-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                      Today
                    </span>
                  )}
                </div>

                {hasJobs && (
                  <div className="space-y-1">
                    {day.jobs.map((job) => {
                      const deadlineInfo = getDeadlineInfo(
                        job.applicationDeadline
                      );
                      
                      // FIX: Handle the 'none' case properly
                      const urgencyColors: Record<typeof deadlineInfo.urgency, string> = {
                        overdue: "bg-red-100 border-red-500 text-red-800",
                        critical: "bg-orange-100 border-orange-500 text-orange-800",
                        warning: "bg-yellow-100 border-yellow-500 text-yellow-800",
                        normal: "bg-green-100 border-green-500 text-green-800",
                        plenty: "bg-blue-100 border-blue-500 text-blue-800",
                        none: "bg-gray-100 border-gray-500 text-gray-800",
                      };

                      return (
                        <button
                          key={job._id}
                          onClick={() => setSelectedJob(job)}
                          className={`w-full text-left p-2 rounded border-l-4 text-xs hover:shadow transition-shadow ${
                            urgencyColors[deadlineInfo.urgency]
                          }`}
                        >
                          <div className="font-medium truncate">
                            {job.company}
                          </div>
                          <div className="truncate text-gray-600">
                            {job.jobTitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <Card className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          Deadline Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {jobsWithDeadlines.length}
            </div>
            <div className="text-sm text-gray-600">Total with Deadlines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {
                jobsWithDeadlines.filter(
                  (j) => getDeadlineInfo(j.applicationDeadline).urgency === "overdue"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {
                jobsWithDeadlines.filter(
                  (j) => getDeadlineInfo(j.applicationDeadline).urgency === "critical"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Due in 0-3 Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {
                jobsWithDeadlines.filter(
                  (j) => getDeadlineInfo(j.applicationDeadline).urgency === "warning"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Due in 4-7 Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {
                jobsWithDeadlines.filter((j) => {
                  const urgency = getDeadlineInfo(j.applicationDeadline).urgency;
                  return urgency === "normal" || urgency === "plenty";
                }).length
              }
            </div>
            <div className="text-sm text-gray-600">8+ Days</div>
          </div>
        </div>
      </Card>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedJob.jobTitle}
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedJob.company}
                </h3>
                {selectedJob.location && (
                  <p className="text-gray-600">📍 {selectedJob.location}</p>
                )}
              </div>

              <div>
                <DeadlineIndicator
                  applicationDeadline={selectedJob.applicationDeadline}
                  showFullDate={true}
                  size="lg"
                />
              </div>

              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                  {selectedJob.type}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                  {selectedJob.industry}
                </span>
              </div>

              {selectedJob.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={() => navigate(`/Jobs`)}>
                  View in Job List
                </Button>
                {selectedJob.jobPostingUrl && (
                  <a
                    href={selectedJob.jobPostingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary">View Posting →</Button>
                  </a>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <Button variant="secondary" onClick={() => navigate("/Jobs")}>
          ← Back to Job List
        </Button>
      </div>
    </div>
  );
}

export default DeadlineCalendar;