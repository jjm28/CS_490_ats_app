// src/components/Jobs/JobCompetitiveAnalysisDashboard.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";

import {
  getCompetitiveAnalysis,
  type CompetitiveAnalysisResponse,
} from "../../api/competitive";

const JobCompetitiveAnalysisDashboard: React.FC = () => {
  const [data, setData] = useState<CompetitiveAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // For now, rely on backend defaults (targetRole="swe", roleLevel="entry")
        const result = await getCompetitiveAnalysis();
        setData(result);
      } catch (err: any) {
        console.error("Error fetching competitive analysis:", err);
        setError(
          err?.message ||
            "Failed to load competitive analysis. Please try again."
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
            Loading your competitive analysis and benchmarks…
          </p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
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
            logs for <code>/api/competitive-analysis</code>.
          </p>
        </Card>
      </div>
    );
  }

  const { userMetrics, comparisons, skillGaps, experience, recommendations } =
    data;

  const funnelLabel = summarizeFunnel(comparisons);
  const experienceLabel = summarizeExperience(experience);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Header onBack={handleBack} />

      {/* High-level summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Your funnel (last period)
          </h2>
          <p className="text-2xl font-bold text-gray-900">
            {userMetrics.applications}{" "}
            <span className="text-base font-medium text-gray-500">
              applications
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {userMetrics.interviews} interviews · {userMetrics.offers} offers
          </p>
          <p className="mt-2 text-xs text-gray-600 italic">{funnelLabel}</p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Conversion vs peers
          </h2>
          <p className="text-sm text-gray-700">
            Interviews / application:{" "}
            <strong>
              {(userMetrics.interviewsPerApplication * 100).toFixed(1)}%
            </strong>
          </p>
          <p className="text-sm text-gray-700">
            Offers / interview:{" "}
            <strong>
              {(userMetrics.offersPerInterview * 100).toFixed(1)}%
            </strong>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Benchmarked against typical &amp; top performers for your role.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Weekly time investment
          </h2>
          <p className="text-2xl font-bold text-gray-900">
            {userMetrics.timePerWeek.toFixed(1)}{" "}
            <span className="text-base font-medium text-gray-500">hours</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ~{Math.round(userMetrics.timeSummary.totalMinutes)} minutes over the
            last 30 days.
          </p>
          <p className="mt-2 text-xs text-gray-600">
            {summarizeTimePosition(comparisons.hoursPerWeek.position)}
          </p>
        </Card>
      </div>

      {/* Funnel vs benchmarks */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          You vs peer benchmarks
        </h2>
        <div className="grid gap-4 md:grid-cols-3 text-sm text-gray-800">
          <MetricComparison
            title="Interviews per application"
            metric={comparisons.interviewsPerApplication}
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <MetricComparison
            title="Offers per interview"
            metric={comparisons.offersPerInterview}
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <MetricComparison
            title="Hours per week on job search"
            metric={comparisons.hoursPerWeek}
            format={(v) => `${v.toFixed(1)}h`}
          />
        </div>
      </Card>

      {/* Skills vs standard stack */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Skills vs standard stack ({skillGaps.roleKey.toUpperCase()})
        </h2>
        <p className="text-sm text-gray-700 mb-3">
          You cover{" "}
          <span className="font-semibold">
            {skillGaps.coveragePercent}% of the common stack
          </span>{" "}
          for this role.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {skillGaps.standardStack.map((skill) => {
            const hasIt = skillGaps.matchedSkills.includes(skill);
            return (
              <span
                key={skill}
                className={`px-2 py-1 rounded-full text-xs ${
                  hasIt
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}
              >
                {skill}
              </span>
            );
          })}
        </div>
        {skillGaps.missingSkills.length > 0 && (
          <p className="text-xs text-gray-600">
            Suggested focus skills:{" "}
            <span className="font-medium">
              {skillGaps.missingSkills.slice(0, 5).join(", ")}
              {skillGaps.missingSkills.length > 5 ? "…" : ""}
            </span>
          </p>
        )}
      </Card>

      {/* Experience vs level */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Experience vs role level
        </h2>
        <p className="text-sm text-gray-700">
          Target role level:{" "}
          <span className="font-semibold capitalize">
            {experience.roleLevel}
          </span>
        </p>
        <p className="text-sm text-gray-700">
          Your years of experience:{" "}
          <span className="font-semibold">
            {experience.yearsOfExperience ?? "Not specified"}
          </span>
        </p>
        {experience.benchmarkRange && (
          <p className="text-sm text-gray-700">
            Typical range:{" "}
            <span className="font-semibold">
              {experience.benchmarkRange.min}–{experience.benchmarkRange.max}{" "}
              years
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-gray-600 italic">
          {experienceLabel}
        </p>
      </Card>

      {/* Recommendations */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          Recommendations &amp; differentiation strategies
        </h2>
        {recommendations?.length ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Keep using the platform so we can build a stronger picture of your
            performance vs the market.
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
        Competitive Analysis &amp; Market Position
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        See how your job search funnel and skills compare to typical and top
        performers in your role.
      </p>
    </div>
    <Button onClick={onBack}>Back to Jobs</Button>
  </div>
);

const MetricComparison: React.FC<{
  title: string;
  metric: {
    you: number;
    average: number;
    top: number;
    position: string;
  };
  format: (v: number) => string;
}> = ({ title, metric, format }) => {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>
      <div className="space-y-1">
        <p className="text-sm text-gray-700">
          You: <span className="font-semibold">{format(metric.you)}</span>
        </p>
        <p className="text-xs text-gray-600">
          Typical: <span className="font-medium">{format(metric.average)}</span>
        </p>
        <p className="text-xs text-gray-600">
          Top performers:{" "}
          <span className="font-medium">{format(metric.top)}</span>
        </p>
        <p className="text-xs text-gray-500">
          Position:{" "}
          <span className="font-semibold">
            {humanizePosition(metric.position)}
          </span>
        </p>
      </div>
    </div>
  );
};

function humanizePosition(position: string): string {
  switch (position) {
    case "below_average":
      return "Below typical peers";
    case "above_average":
      return "Above typical peers";
    case "top":
      return "Top performer band";
    case "unknown":
      return "Not enough data";
    default:
      return position.replace(/_/g, " ");
  }
}

function summarizeFunnel(comparisons: CompetitiveAnalysisResponse["comparisons"]) {
  const interviewPos = humanizePosition(
    comparisons.interviewsPerApplication.position
  );
  const offerPos = humanizePosition(
    comparisons.offersPerInterview.position
  );

  if (
    comparisons.interviewsPerApplication.position === "below_average" &&
    comparisons.offersPerInterview.position === "below_average"
  ) {
    return "Your interview and offer conversion are both below typical peers. Focus on both targeting and interview prep.";
  }

  if (
    comparisons.interviewsPerApplication.position === "above_average" &&
    comparisons.offersPerInterview.position === "below_average"
  ) {
    return "You’re getting interviews, but offers are lagging. Lean into interview prep and storytelling.";
  }

  if (
    comparisons.interviewsPerApplication.position === "below_average" &&
    comparisons.offersPerInterview.position === "above_average"
  ) {
    return "You convert interviews well, but aren’t getting enough of them. Prioritize better-targeted applications.";
  }

  return `Interview funnel: ${interviewPos}. Offer funnel: ${offerPos}.`;
}

function summarizeTimePosition(position: string): string {
  switch (position) {
    case "below_average":
      return "You’re currently investing less time than typical peers. Consider reserving a few focused blocks each week.";
    case "above_average":
    case "top":
      return "You’re investing a strong amount of time. Make sure those hours are focused on high-yield activities.";
    case "unknown":
    default:
      return "As you log more sessions, we’ll better understand your time investment vs peers.";
  }
}

function summarizeExperience(experience: CompetitiveAnalysisResponse["experience"]) {
  if (!experience.yearsOfExperience || !experience.benchmarkRange) {
    return "Once your years of experience are recorded, we’ll show how they compare to typical levels for this role.";
  }

  switch (experience.position) {
    case "below_range":
      return `Your experience is below the typical range for ${experience.roleLevel} roles. Highlight strong projects, internships, and measurable outcomes to compensate.`;
    case "within_range":
      return `Your experience falls within the typical range for ${experience.roleLevel} roles. Focus on differentiation through skills, projects, and impact.`;
    case "above_range":
      return `You have more experience than is typical for ${experience.roleLevel} roles. You may want to target higher-level roles or emphasize leadership and ownership.`;
    default:
      return "We’ll refine this comparison as more profile data is available.";
  }
}

export default JobCompetitiveAnalysisDashboard;
