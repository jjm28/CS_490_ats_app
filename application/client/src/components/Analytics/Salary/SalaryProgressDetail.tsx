import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SalaryProgressionChart from "./SalaryProgressionChart";
import { getJobById } from "../../../api/jobs";

export default function SalaryProgressDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getJobById(jobId!);
        setJob(data);
      } catch (err: any) {
        setError(err.message || "Failed to load job");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId]);

  if (loading) return <div className="p-6">Loading salary progression…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!job) return <div className="p-6">Job not found</div>;

  const history = job.salaryHistory || [];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-(--brand-navy)">
        Salary Progression — {job.jobTitle} @ {job.company}
      </h1>

      <SalaryProgressionChart
        history={history}
        jobTitle={job.jobTitle}
        company={job.company}
      />
    </div>
  );
}