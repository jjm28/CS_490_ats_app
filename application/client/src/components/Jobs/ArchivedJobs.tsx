import React, { useEffect, useState } from "react";
import { getArchivedJobs, toggleArchiveJob, deleteJob } from "../../api/jobs";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";

const ArchivedJobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchived();
  }, []);

  async function loadArchived() {
    try {
      const data = await getArchivedJobs();
      setJobs(data);
    } catch (err) {
      console.error("Error loading archived jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    await toggleArchiveJob(id, false);
    setJobs((prev) => prev.filter((j) => j._id !== id));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this job permanently?")) return;
    await deleteJob(id);
    setJobs((prev) => prev.filter((j) => j._id !== id));
  }

  if (loading) return <p className="p-6">Loading archived jobs...</p>;

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">📦 Archived Jobs</h1>

      {jobs.length === 0 ? (
        <p className="text-gray-500">No archived jobs.</p>
      ) : (
        jobs.map((job) => (
          <Card key={job._id} className="mb-4">
            <h2 className="text-lg font-semibold">{job.jobTitle}</h2>
            <p className="text-sm text-gray-600">{job.company}</p>

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
    </div>
  );
};

export default ArchivedJobs;