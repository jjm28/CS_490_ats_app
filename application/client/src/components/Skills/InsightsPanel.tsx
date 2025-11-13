import { useState, useEffect } from "react";
import Card from "../StyledComponents/Card";
import type { Skill } from "./Skills";

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  matchBreakdown?: {
    skills: number;
    experience: number;
    education: number;
  };
  skillGaps?: string[];
  matchedSkills?: string[];
  matchHistory?: Array<{
    score: number;
    breakdown: {
      skills: number;
      experience: number;
      education: number;
    };
    skillGaps: string[];
    matchedSkills: string[];
    timestamp: string;
  }>;
}

interface SkillInsightsPanelProps {
  skills: Skill[];
}

interface LearnResource {
  title: string;
  link: string;
  snippet: string;
}

export default function SkillInsightsPanel({ skills }: SkillInsightsPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [learningLinks, setLearningLinks] = useState<Record<string, LearnResource[]>>({});

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error("❌ Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveMatchData = (job: Job) => {
    if (job.matchScore > 0) {
      return {
        score: job.matchScore,
        breakdown: job.matchBreakdown,
        skillGaps: job.skillGaps || [],
        matchedSkills: job.matchedSkills || [],
      };
    }
    const latest = job.matchHistory?.[job.matchHistory.length - 1];
    return latest
      ? {
          score: latest.score,
          breakdown: latest.breakdown,
          skillGaps: latest.skillGaps || [],
          matchedSkills: latest.matchedSkills || [],
        }
      : { score: 0, breakdown: { skills: 0, experience: 0, education: 0 }, skillGaps: [], matchedSkills: [] };
  };

  const calculateInsights = () => {
    if (jobs.length === 0) {
      return { averageMatch: 0, totalMatched: 0, missingSkills: new Map<string, number>() };
    }

    let totalSkillMatch = 0;
    const missingSkills = new Map<string, number>();

    jobs.forEach((job) => {
      const matchData = getEffectiveMatchData(job);
      if (matchData.score > 0 || job.matchHistory?.length) {
        totalSkillMatch += matchData.breakdown?.skills || 0;
        matchData.skillGaps.forEach((skill) => {
          missingSkills.set(skill, (missingSkills.get(skill) || 0) + 1);
        });
      }
    });

    const analyzedJobsCount = jobs.filter((job) => {
      const matchData = getEffectiveMatchData(job);
      return matchData.score > 0 || job.matchHistory?.length;
    }).length;

    const averageMatch = analyzedJobsCount > 0 ? totalSkillMatch / analyzedJobsCount : 0;
    return { averageMatch: Math.round(averageMatch), totalMatched: analyzedJobsCount, missingSkills };
  };

  const insights = calculateInsights();
  const topMissingSkills = Array.from(insights.missingSkills.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 🧠 Fetch learning links for a specific skill
  const fetchLearningLinks = async (skill: string) => {
    try {
      if (learningLinks[skill]) return; // already fetched
      const res = await fetch(`/api/learn?skill=${encodeURIComponent(skill)}`);
      const data = await res.json();
      setLearningLinks((prev) => ({ ...prev, [skill]: data.results || [] }));
    } catch (err) {
      console.error("Error fetching learning links:", err);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Skill Readiness Overview</h2>
          <p className="text-gray-500">Loading job matches...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Skill Readiness Overview</h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {showDetails ? "▲" : "▼"} {showDetails ? "Hide details" : "Show details"}
          </button>
        </div>

        {showDetails && (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${insights.averageMatch}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                {insights.averageMatch}% skills matched across jobs
              </p>
            </div>

            <hr className="my-4" />

            {/* Missing Skills Section */}
            <div>
              <h3 className="font-semibold mb-2">Missing Skills</h3>
              {topMissingSkills.length > 0 ? (
                <ul className="space-y-3">
                  {topMissingSkills.map(([skill, count]) => (
                    <li key={skill} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{skill}</span>
                        <span className="text-sm text-gray-600">
                          Required in {count} {count === 1 ? "job" : "jobs"}
                        </span>
                      </div>

                      {/* 🎓 Learn more section */}
                      <button
                        onClick={() => fetchLearningLinks(skill)}
                        className="text-blue-600 text-sm mt-2 hover:underline"
                      >
                        🔍 Find tutorials for {skill}
                      </button>

                      {learningLinks[skill] && (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {learningLinks[skill].length > 0 ? (
                            learningLinks[skill].map((link) => (
                              <li key={link.link}>
                                <a
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  {link.title}
                                </a>
                                <p className="text-gray-500 text-xs">{link.snippet}</p>
                              </li>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">No tutorials found yet.</p>
                          )}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  {jobs.length === 0
                    ? "Add some jobs to see skill insights."
                    : insights.totalMatched === 0
                    ? "Jobs haven't been analyzed yet. View individual jobs to trigger analysis."
                    : "No missing skills identified yet."}
                </p>
              )}
            </div>

            {/* Stats */}
            {jobs.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                <p className="text-gray-700">
                  📊 Analyzed <strong>{insights.totalMatched}</strong> of{" "}
                  <strong>{jobs.length}</strong> jobs
                </p>
                {insights.totalMatched < jobs.length && (
                  <p className="text-gray-600 mt-1 text-xs">
                    💡 Tip: View individual jobs to analyze them
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
