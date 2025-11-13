import { useEffect, useState } from "react";
import { getAllJobs } from "../../api/jobs";

interface Props {
  config: any;
  onChange: (updated: any) => void;
}

export default function FollowUpReminderConfig({ config, onChange }: Props) {
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

  if (loading) return <p>Loading jobs…</p>;

  return (
    <div className="space-y-4">
      {/* JOB SELECTOR */}
      <div>
        <label className="block font-medium mb-1">Select Job</label>
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

      {/* REMINDER INTERVAL (optional, informational for now) */}
      <div>
        <label className="block font-medium mb-1">Reminder Interval</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.interval || "none"}
          onChange={(e) =>
            onChange({
              ...config,
              interval: e.target.value,
            })
          }
        >
          <option value="none">One-Time Only</option>
          <option value="daily">Daily</option>
          <option value="3days">Every 3 Days</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {/* MESSAGE TEMPLATE */}
      <div>
        <label className="block font-medium mb-1">Follow-Up Message</label>
        <textarea
          className="border rounded px-3 py-2 w-full h-28"
          placeholder="Example: Just checking in on the status of my application…"
          value={config.message || ""}
          onChange={(e) =>
            onChange({
              ...config,
              message: e.target.value,
            })
          }
        />
      </div>

      <p className="text-xs text-gray-500">
        Use the date &amp; time picker above (“When should this run?”) to choose
        when this reminder should fire. At that time, a follow-up notification
        will be created using this message.
      </p>
    </div>
  );
}