import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  startProductivitySession,
  endProductivitySession,
} from "../../api/productivity";

type JobOpportunity = {
  _id: string;
  jobTitle: string;
  company: string;
  location?: string;
  userExpectedSalary?: number;
};

type SalaryResearch = {
  jobId?: string;
  average?: number;
  min?: number;
  max?: number;
  sourceCount?: number;
  message?: string;
  cached?: boolean;
  cachedAt?: string;
  updatedAt?: string;
  error?: string;
};

export default function SalaryResearchPage() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [salaryData, setSalaryData] = useState<Record<string, SalaryResearch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper function to determine if job is an internship
  const isInternship = (jobTitle: string): boolean => {
    return /intern/i.test(jobTitle);
  };

  // Convert annual salary to hourly (assuming 2080 working hours per year)
  const annualToHourly = (annual: number): number => {
    return Math.round((annual / 2080) * 100) / 100;
  };

  // Time tracking for productivity while viewing Salary Research
  useEffect(() => {
    let canceled = false;
    let sessionId: string | null = null;

    (async () => {
      try {
        const session = await startProductivitySession({
          activityType: "salary_research",
          context: "SalaryResearchPage",
        });
        if (!canceled) {
          sessionId = session._id;
        }
      } catch (err) {
        console.error(
          "[productivity] Failed to start salary_research session:",
          err
        );
      }
    })();

    return () => {
      canceled = true;
      if (sessionId) {
        endProductivitySession({ sessionId }).catch((err) =>
          console.error(
            "[productivity] Failed to end salary_research session:",
            err
          )
        );
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const fetchedJobs = new Set<string>();

    async function loadJobsAndSalaries() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (isMounted) setError("You must be logged in to view salary research.");
          return;
        }

        const jobRes = await fetch("/api/jobs", {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
        
        if (!jobRes.ok) throw new Error(`Job fetch failed (${jobRes.status})`);

        const jobsData: JobOpportunity[] = await jobRes.json();
        if (isMounted) setJobs(jobsData);

        const salaryResults: Record<string, SalaryResearch> = {};
        
        for (const job of jobsData) {
          if (fetchedJobs.has(job._id)) continue;
          fetchedJobs.add(job._id);
          
          try {
            const salaryRes = await fetch(`/api/salary/${job._id}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: abortController.signal,
            });
            
            if (!salaryRes.ok) {
              console.warn(`Salary fetch failed for ${job.jobTitle}: ${salaryRes.status}`);
              salaryResults[job._id] = {
                error: `Failed (${salaryRes.status})`,
                message: "Unable to retrieve salary data"
              };
              continue;
            }
            
            const salaryJson: SalaryResearch = await salaryRes.json();
            console.log("📊 Raw salary response for", job.jobTitle, ":", salaryJson);
            salaryResults[job._id] = salaryJson;
            
            if (isMounted) {
              setSalaryData(prev => ({ ...prev, [job._id]: salaryJson }));
            }
            
          } catch (e: any) {
            if (e.name === 'AbortError') break;
            console.warn("Error fetching salary for job:", job.jobTitle, e);
            salaryResults[job._id] = {
              error: e.message,
              message: "Unable to retrieve salary data"
            };
          }
        }

        if (isMounted) setSalaryData(salaryResults);
        
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
        if (isMounted) setError(`Failed to load salary data: ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadJobsAndSalaries();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p>Loading salary estimates...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-red-600 text-center">
        <p className="text-lg font-semibold mb-2">⚠️ Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!jobs.length) {
    return (
      <div className="p-6 text-gray-500 text-center">
        <p className="text-lg mb-2">No jobs found.</p>
        <Link to="/jobs" className="text-blue-600 hover:underline">
          Add some jobs to get started →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Salary Research</h1>
        <p className="text-sm text-gray-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      {jobs.map((job) => {
        const salary = salaryData[job._id];
        
        console.log("🔍 Rendering job:", job.jobTitle);
        console.log("  - Salary object:", salary);
        console.log("  - Has average?:", salary?.average);
        console.log("  - Has min?:", salary?.min);
        console.log("  - Has max?:", salary?.max);
        
        // The salary data is flat: { average, min, max, sourceCount, cached }
        const hasData = salary && salary.average !== undefined && !salary.error;
        const isIntern = isInternship(job.jobTitle);
        
        return (
          <div
              key={job._id}
              className="bg-white shadow-lg p-6 rounded-xl border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-center items-start mb-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {job.jobTitle}
                  </h2>
                  <p className="text-gray-600">{job.company}</p>
                  {job.location && (
                    <p className="text-sm text-gray-500 mt-1">📍 {job.location}</p>
                  )}
                  
                  <div className="flex gap-2 justify-center mt-2">
                    {isIntern && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                        Internship
                      </span>
                    )}
                    {salary?.cached && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Cached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {hasData ? (
                <div className="space-y-4">
                  {/* Average Salary - Large Display */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-lg border border-green-200">
                    <div className="flex items-baseline justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">💰 Average {isIntern ? 'Hourly Rate' : 'Salary'}</p>
                        <p className="text-4xl font-bold text-green-700">
                          ${isIntern 
                            ? annualToHourly(salary!.average!).toLocaleString()
                            : salary!.average!.toLocaleString()
                          }
                          {isIntern && <span className="text-xl text-gray-600">/hr</span>}
                        </p>
                          
                        {/* 🆕 Add MIN & MAX */}
                        <div className="mt-2 text-sm text-gray-600 flex gap-4 justify-center">
                          <span>
                            <strong>Min:</strong> $
                            {isIntern
                              ? annualToHourly(salary.min!).toLocaleString()
                              : Math.round(salary.min!).toLocaleString()}
                            {isIntern && "/hr"}
                          </span>
                          <span>
                            <strong>Max:</strong> $
                            {isIntern
                              ? annualToHourly(salary.max!).toLocaleString()
                              : Math.round(salary.max!).toLocaleString()}
                            {isIntern && "/hr"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Salary Range */}
                  {salary.min && salary.max && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        📊 Salary Range {isIntern ? '(Hourly)' : ''}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Minimum</p>
                          <p className="text-xl font-semibold text-gray-800">
                            ${isIntern 
                              ? annualToHourly(salary.min).toLocaleString()
                              : Math.round(salary.min).toLocaleString()
                            }
                            {isIntern && <span className="text-sm">/hr</span>}
                          </p>
                          {isIntern && (
                            <p className="text-xs text-gray-500">
                              (${Math.round(salary.min).toLocaleString()}/year)
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Maximum</p>
                          <p className="text-xl font-semibold text-gray-800">
                            ${isIntern 
                              ? annualToHourly(salary.max).toLocaleString()
                              : Math.round(salary.max).toLocaleString()
                            }
                            {isIntern && <span className="text-sm">/hr</span>}
                          </p>
                          {isIntern && (
                            <p className="text-xs text-gray-500">
                              (${Math.round(salary.max).toLocaleString()}/year)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Visual Range Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 via-green-400 to-green-600"></div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>Low</span>
                          <span>Average</span>
                          <span>High</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Source Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-100">
                    <div>
                      {salary.sourceCount && (
                        <span>
                          📈 Based on <strong>{salary.sourceCount}</strong> job posting{salary.sourceCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {salary.updatedAt && (
                      <span className="text-xs text-gray-400">
                        Updated: {new Date(salary.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* User's Expected Salary Comparison */}
                  {job.userExpectedSalary && salary.average && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Your expectation:</p>
                          <p className="text-lg font-semibold text-gray-800">
                            ${job.userExpectedSalary.toLocaleString()}
                            {isIntern && <span className="text-sm">/hr</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          {job.userExpectedSalary <= salary.average ? (
                            <span className="inline-flex items-center text-green-700 font-medium">
                              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Within range
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-600 font-medium">
                              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Above average
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {((job.userExpectedSalary / salary.average - 1) * 100).toFixed(1)}% 
                            {job.userExpectedSalary > salary.average ? ' higher' : ' lower'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : salary?.error ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-red-700 font-medium">❌ Error loading salary data</p>
                  <p className="text-sm text-red-600 mt-1">{salary.error}</p>
                  {salary.message && (
                    <p className="text-sm text-gray-600 mt-2">{salary.message}</p>
                  )}
                </div>
              ) : salary?.message ? (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-gray-700">ℹ️ {salary.message}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-center">
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Loading salary data...
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  to={`/jobs/${job._id}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center"
                >
                  View Job Details 
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
          </div>
        );
      })}
    </div>
  );
}
