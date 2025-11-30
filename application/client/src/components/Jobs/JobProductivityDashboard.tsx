// src/components/Jobs/JobProductivityDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { getProductivityOverview } from "../../api/productivity";

type Overview = {
  summary: {
    totalMinutes: number;
    totalHours: number;
    periodDays: number;
  };
  activityBreakdown: {
    activityType: string;
    minutes: number;
    hours: number;
    percent: number;
  }[];
  schedulePatterns: {
    byDayOfWeek: { day: string; minutes: number; hours: number }[];
    byHourOfDay: { hour: number; minutes: number; hours: number }[];
    bestWindows: { hour: number; label: string; minutes: number }[];
  };
  outcomes: {
    applicationsPerHour: number;
    interviewsPerHour: number;
    offersPerHour: number;
    totalApplications: number;
    totalInterviews: number;
    totalOffers: number;
  };
  wellbeing: {
    avgMinutesPerDay: number;
    weeklyHoursEstimate: number;
    highLoadDays: number;
    burnoutRisk: "low" | "medium" | "high" | string;
  };
  energyCorrelation: {
    overallAverage: number | null;
    byActivityType: { activityType: string; averageEnergy: number }[];
    byTimeOfDay: { hour: number; averageEnergy: number | null }[];
  };
  recommendations: string[];
};

const JobProductivityDashboard: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // backend defaults to last 30 days
        const data = await getProductivityOverview();
        setOverview(data as Overview);
      } catch (err: any) {
        console.error("Error fetching productivity overview:", err);
        setError(
          err?.message ||
            "Failed to load productivity & time analytics. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleBack = () => navigate("/Jobs");

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Header onBack={handleBack} />
        <Card>
          <p className="text-sm text-gray-500">
            Loading your job search productivity data…
          </p>
        </Card>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Header onBack={handleBack} />
        <Card>
          {error && (
            <p className="text-sm text-red-600 mb-2">
              {error || "Something went wrong."}
            </p>
          )}
          <p className="text-sm text-gray-500">
            Try refreshing the page. If this keeps happening, check the backend
            logs for <code>/api/productivity/overview</code>.
          </p>
        </Card>
      </div>
    );
  }

  const { summary, activityBreakdown, schedulePatterns, outcomes, wellbeing } =
    overview;

  
  const docActivities = activityBreakdown.filter((item) =>
    ["resume_edit", "coverletter_edit"].includes(item.activityType)
  );

  const totalDocMinutes = docActivities.reduce(
    (sum, item) => sum + (item.minutes || 0),
    0
  );
  const totalDocHours = totalDocMinutes / 60;

  const resumeRow = docActivities.find(
    (item) => item.activityType === "resume_edit"
  );
  const coverletterRow = docActivities.find(
    (item) => item.activityType === "coverletter_edit"
  );
  

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Header onBack={handleBack} />

      {/* Summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Time Logged (last {summary.periodDays} days)
          </h2>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalHours.toFixed(1)}{" "}
            <span className="text-base font-medium text-gray-500">hours</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            (~{summary.totalMinutes} total minutes)
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Weekly Time Estimate
          </h2>
          <p className="text-2xl font-bold text-gray-900">
            {wellbeing.weeklyHoursEstimate.toFixed(1)}{" "}
            <span className="text-base font-medium text-gray-500">hours</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Based on your average minutes per active day.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Balance & Burnout
          </h2>
          <p className="text-lg font-semibold text-gray-900 capitalize">
            {wellbeing.burnoutRisk} risk
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {wellbeing.highLoadDays} high-load day
            {wellbeing.highLoadDays === 1 ? "" : "s"} in the last{" "}
            {summary.periodDays} days.
          </p>
        </Card>
      </div>

      {/* Activity breakdown */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Time Investment by Activity
        </h2>
        {activityBreakdown.length === 0 ? (
          <p className="text-sm text-gray-500">
            No tracked sessions yet. Start a focus session from the Jobs page to
            see your breakdown here.
          </p>
        ) : (
          <div className="space-y-2">
            {activityBreakdown.map((item) => (
              <div
                key={item.activityType}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">
                    {labelForActivity(item.activityType)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.percent}% of time
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {item.hours.toFixed(1)}h ({item.minutes} min)
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Document Editing Time
        </h2>
        {totalDocMinutes === 0 ? (
          <p className="text-sm text-gray-500">
            No resume or cover letter editing activity recorded yet. As you edit
            resumes and cover letters in the editors, we’ll track and summarize
            that time here.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Over the last {summary.periodDays} days, you’ve spent{" "}
              <span className="font-semibold">
                {Math.round(totalDocMinutes)} minutes
              </span>{" "}
              ({totalDocHours.toFixed(1)} hours) actively editing resumes and
              cover letters.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border rounded-md p-3 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">
                  Resume editing
                </h3>
                <p className="text-lg font-bold text-gray-900">
                  {resumeRow ? Math.round(resumeRow.minutes) : 0} min
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Time spent tailoring your resume content and layout.
                </p>
              </div>

              <div className="border rounded-md p-3 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">
                  Cover letter editing
                </h3>
                <p className="text-lg font-bold text-gray-900">
                  {coverletterRow ? Math.round(coverletterRow.minutes) : 0} min
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Time invested in personalized cover letters for specific
                  roles.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Tip: Prioritize this editing time for high-match roles where you
              meet most requirements. If you see lots of editing time with few
              interviews, consider tightening which roles you invest heavy
              customization into.
            </p>
          </div>
        )}
      </Card>
      

      {/* Patterns & outcomes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Best Time Windows
          </h2>
          {schedulePatterns.bestWindows.length === 0 ? (
            <p className="text-sm text-gray-500">
              As you log more sessions, we’ll highlight your highest-focus time
              windows here.
            </p>
          ) : (
            <ul className="space-y-1 text-sm text-gray-700">
              {schedulePatterns.bestWindows.map((slot) => (
                <li key={slot.hour}>
                  <span className="font-medium">{slot.label}</span>: ~
                  {slot.minutes} min logged
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Outcomes vs Time
          </h2>
          <p className="text-sm text-gray-700">
            Applications per hour:{" "}
            <span className="font-semibold">
              {outcomes.applicationsPerHour.toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-gray-700">
            Interviews per hour:{" "}
            <span className="font-semibold">
              {outcomes.interviewsPerHour.toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-gray-700">
            Offers per hour:{" "}
            <span className="font-semibold">
              {outcomes.offersPerHour.toFixed(2)}
            </span>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            These numbers will become more meaningful as you track more
            sessions, submit more applications, and record outcomes.
          </p>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Productivity Coaching & Suggestions
        </h2>
        {overview.recommendations?.length ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {overview.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Keep logging your job search time. As more data appears, we’ll make
            specific recommendations here.
          </p>
        )}
      </Card>
    </div>
  );
};

const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Productivity &amp; Time Insights
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Analyze how you spend time on your job search and get guidance on where
        to focus next.
      </p>
    </div>
    <Button onClick={onBack}>Back to Jobs</Button>
  </div>
);

function labelForActivity(activityType: string): string {
  switch (activityType) {
    case "job_search":
      return "Job search & browsing";
    case "job_research":
    case "company_research":
      return "Company & role research";
    case "resume_edit":
      return "Resume editing";
    case "coverletter_edit":
      return "Cover letter editing";
    default:
      // fall back to a prettified label
      return activityType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export default JobProductivityDashboard;
