import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type JobOpportunity = {
  _id: string;
  jobTitle: string;
  company: string;
  location?: string;
  userExpectedSalary?: number;
};

type SalaryResearch = {
  jobId: string;
  aggregated?: {
    average?: number;
    min?: number;
    max?: number;
  };
  summary?: string;
  tips?: string;
  updatedAt?: string;
};
export default function SalaryResearchPage() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [salaryData, setSalaryData] = useState<Record<string, SalaryResearch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  let isMounted = true;

  async function loadJobsAndSalaries() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isMounted) setError("You must be logged in to view salary research.");
        return;
      }

      const jobRes = await fetch("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!jobRes.ok) throw new Error(`Job fetch failed (${jobRes.status})`);

      const jobsData: JobOpportunity[] = await jobRes.json();
      if (isMounted) setJobs(jobsData);

      const salaryResults: Record<string, SalaryResearch> = {};
      for (const job of jobsData) {
        try {
          const salaryRes = await fetch(`/api/salary/${job._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!salaryRes.ok) continue;
          const salaryJson: SalaryResearch = await salaryRes.json();
          salaryResults[job._id] = salaryJson;
        } catch (e) {
          console.warn("Error fetching salary for job:", job.jobTitle, e);
        }
      }

          if (isMounted) setSalaryData(salaryResults);
        } catch (err) {
          console.error(err);
          if (isMounted) setError("Failed to load salary data.");
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      loadJobsAndSalaries();
      return () => {
        isMounted = false;
      };
    }, []);


  if (loading) return <div className="p-6 text-gray-500 text-center">Loading salary estimates...</div>;
  if (error) return <div className="p-6 text-red-600 text-center">{error}</div>;
  if (!jobs.length) return <div className="p-6 text-gray-500 text-center">No jobs found.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Salary Research</h1>

      {jobs.map((job) => {
        const salary = salaryData[job._id];
        return (
          <div
            key={job._id}
            className="bg-white shadow-md p-6 rounded-xl border space-y-2"
          >
            <h2 className="text-lg font-semibold">
              {job.jobTitle} <span className="text-gray-500">at {job.company}</span>
            </h2>

           {salary?.aggregated ? (
            <p className="text-gray-700">
              💰 Estimated Range:{" "}
              <strong>
                ${salary.aggregated.min?.toLocaleString()} - $
                {salary.aggregated.max?.toLocaleString()}
              </strong>{" "}
              (Avg: ${salary.aggregated.average?.toLocaleString()})
            </p>
          ) : (
            <p className="text-gray-500">No salary range estimated yet.</p>
          )}

          {salary?.summary && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
              <strong>Gemini Summary:</strong> {salary.summary}
            </div>
          )}

          {salary?.tips && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
              <strong>Gemini Tips:</strong> {salary.tips}
            </div>
          )}

          {salary?.updatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {new Date(salary.updatedAt).toLocaleDateString()}
            </p>
          )}

            <Link
              to={`/jobs/${job._id}`}
              className="inline-block mt-2 text-blue-600 hover:underline text-sm"
            >
              View Job Details →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
