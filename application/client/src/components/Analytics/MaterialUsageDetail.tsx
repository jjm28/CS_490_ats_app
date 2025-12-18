import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJobsByMaterialVersion } from "../../api/analytics";

export default function MaterialUsageDetail() {
  const { type, versionId } = useParams<{
    type: "resume" | "cover-letter";
    versionId: string;
  }>();

  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!type || !versionId) return;
      const data = await getJobsByMaterialVersion(type, versionId);
      setJobs(data);
      setLoading(false);
    }
    load();
  }, [type, versionId]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2
             px-4 py-2 rounded-lg bg-(--brand-navy)
             text-white text-sm font-medium
             hover:bg-(--brand-navy-hover) transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">
        Jobs using {type === "resume" ? "Resume" : "Cover Letter"} Version
      </h1>

      {jobs.length === 0 ? (
        <p className="text-gray-500 italic">No jobs found.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Applied</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j._id} className="border-t">
                  <td className="px-4 py-3">{j.company}</td>
                  <td className="px-4 py-3">{j.jobTitle}</td>
                  <td className="px-4 py-3 text-center">{j.status}</td>
                  <td className="px-4 py-3 text-center">
                    {j.applicationPackage?.generatedAt
                      ? new Date(
                        j.applicationPackage.generatedAt
                      ).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}