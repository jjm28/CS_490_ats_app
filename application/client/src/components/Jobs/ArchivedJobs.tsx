import React, { useEffect, useState, useMemo } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast"; // ✅ Import toast

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  archiveReason?: string;
}

const ArchivedJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast, Toast } = useToast(); // ✅ Initialize toast

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  useEffect(() => {
    fetchArchivedJobs();
  }, []);

  async function fetchArchivedJobs() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/archived`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Failed to fetch archived jobs: ${msg}`);
      }

      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      console.error("Error loading archived jobs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ archive: false }),
      });

      if (!res.ok) throw new Error("Failed to restore job");

      // ✅ Remove from local archived list instantly
      const restoredJob = jobs.find((j) => j._id === id);
      setJobs((prev) => prev.filter((j) => j._id !== id));

      // ✅ Toast with Undo option
      showToast("Job restored", {
        actionLabel: "Undo",
        onAction: async () => {
          // Re-archive the same job on undo
          await fetch(`${API_BASE}/api/jobs/${id}/archive`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ archive: true }),
          });

          // ✅ Put it back in the list instantly
          if (restoredJob) setJobs((prev) => [restoredJob, ...prev]);
          showToast("Undo successful!");
        },
      });
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore job");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this job permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs((prev) => prev.filter((j) => j._id !== id));
      showToast("Job deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete job");
    }
  }

  if (loading) return <p className="p-6">Loading archived jobs...</p>;
  if (error)
    return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="max-w-3xl mx-auto py-10">
      <Button onClick={() => navigate("/Jobs")} className="mb-3">
        ← Back to Jobs
      </Button>
      <h1 className="text-2xl font-bold mb-4">📦 Archived Jobs</h1>

      {jobs.length === 0 ? (
        <p className="text-gray-500">No archived jobs.</p>
      ) : (
        jobs.map((job) => (
          <Card key={job._id} className="mb-4">
            <h2 className="text-lg font-semibold">{job.jobTitle}</h2>
            <p className="text-sm text-gray-600">{job.company}</p>

            {job.archiveReason && (
              <p className="text-xs text-gray-500 mt-2 italic">
                📝 Archive Reason: {job.archiveReason}
              </p>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => handleRestore(job._id)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Restore
              </Button>
              <Button
                onClick={() => handleDelete(job._id)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))
      )}

      {/* ✅ Toast Component */}
      <Toast />
    </div>
  );
};

export default ArchivedJobs;