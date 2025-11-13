import { useEffect, useState } from "react";
import { getAllJobs } from "../../api/jobs";

interface Props {
  config: any;
  onChange: (updated: any) => void;
}

export default function SubmissionScheduleConfig({ config, onChange }: Props) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const jobList = await getAllJobs();
        setJobs(jobList);
      } catch (err) {
        console.error("Failed to load jobs:", err);
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <p>Loading job list…</p>;

  return (
    <div className="space-y-4">
      {/* Select Job */}
      <div>
        <label className="block font-medium mb-1">
          Select Job to Auto-Submit
        </label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.jobId || ""}
          onChange={(e) =>
            onChange({
              ...config,
              jobId: e.target.value,
            })
          }
        >
          <option value="">-- Choose a Job --</option>
          {jobs.map((job: any) => (
            <option key={job._id} value={job._id}>
              {job.jobTitle} — {job.company}
            </option>
          ))}
        </select>
      </div>

      {/* Optional notes */}
      <div>
        <label className="block font-medium mb-1">Notes (optional)</label>
        <textarea
          className="border rounded px-3 py-2 w-full h-24"
          placeholder="Example: Submit during working hours"
          value={config.notes || ""}
          onChange={(e) =>
            onChange({
              ...config,
              notes: e.target.value,
            })
          }
        />
      </div>

      <p className="text-xs text-gray-500">
        Use the date &amp; time picker above (“When should this run?”) to choose
        when this job should automatically move from Interested to Applied.
      </p>
    </div>
  );
}