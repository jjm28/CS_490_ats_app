import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";

interface Job {
  _id: string;
  title: string;
  company: string;
}

interface LinkJobModalProps {
  eventId: string;
  onClose: () => void;
  onLinked: (updatedEvent: any) => void;
}

export default function LinkJobModal({ eventId, onClose, onLinked }: LinkJobModalProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const authHeaders = () => {
    const auth = localStorage.getItem("authUser");
    const token = auth ? JSON.parse(auth).token : null;

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
          headers: authHeaders(),
        });

        if (!res.ok) throw new Error("Failed to fetch jobs");

        const data = await res.json();
        setJobs(data);
      } catch (err) {
        console.error("Error loading jobs:", err);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  const handleSubmit = async () => {
    if (!selectedJob) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/networking/events/${eventId}/link-job`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ jobId: selectedJob }),
        }
      );

      if (!res.ok) {
        alert("Failed to link job");
        return;
      }

      const updated = await res.json();
      onLinked(updated.event);
      onClose();
    } catch (err) {
      console.error("Error linking job:", err);
    }
  };

  if (loading)
    return (
      <div className="p-6 bg-white rounded shadow-xl text-center">
        Loading jobs...
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] p-6 rounded-xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Link Job to Event</h2>

        <select
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        >
          <option value="">Select Job</option>
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>
              {job.title} @ {job.company}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleSubmit}
          >
            Link Job
          </button>
        </div>
      </div>
    </div>
  );
}
