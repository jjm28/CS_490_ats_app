import { useEffect, useState } from "react";
import { listResumes } from "../../api/resumes";
import { listCoverletters } from "../../api/coverletter";
import { getAllJobs } from "../../api/jobs";

interface Props {
  config: any;
  onChange: (updated: any) => void;
}

export default function ApplicationPackageConfig({ config, onChange }: Props) {
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");

  // Load userId
  useEffect(() => {
    const raw = localStorage.getItem("authUser");
    const auth = raw ? JSON.parse(raw) : null;

    const uid =
      auth?.user?._id ||
      auth?._id ||
      localStorage.getItem("userid") ||
      "";

    setUserId(uid);
  }, []);

  // Load resumes + cover letters + jobs
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const resumeList = await listResumes({ userid: userId });
        const coverList = await listCoverletters({ userid: userId });
        const jobList = await getAllJobs();

        setResumes(resumeList);
        setCoverLetters(coverList);
        setJobs(jobList);
      } catch (err) {
        console.error("Failed loading package dependencies:", err);
      }
    };

    load();
  }, [userId]);

  // Update helper for portfolio URLs (converted to array for backend)
  const updatePortfolio = (value: string) => {
    onChange({
      ...config,
      portfolioUrl: value,
      portfolioUrls: value ? [value] : []  // backend expects array
    });
  };

  return (
    <div className="space-y-4">
      {/* Job */}
      <div>
        <label className="block font-medium mb-1">Job</label>
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
          <option value="">-- Select a Job --</option>
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>
              {job.jobTitle} — {job.company}
            </option>
          ))}
        </select>
      </div>

      {/* Resume */}
      <div>
        <label className="block font-medium mb-1">Resume</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.resumeId || ""}
          onChange={(e) =>
            onChange({
              ...config,
              resumeId: e.target.value,
            })
          }
        >
          <option value="">-- Select a Resume --</option>
          {resumes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.filename || "Untitled Resume"}
            </option>
          ))}
        </select>
      </div>

      {/* Cover Letter */}
      <div>
        <label className="block font-medium mb-1">Cover Letter</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={config.coverLetterId || ""}
          onChange={(e) =>
            onChange({
              ...config,
              coverLetterId: e.target.value,
            })
          }
        >
          <option value="">-- Select a Cover Letter --</option>
          {coverLetters.map((cl) => (
            <option key={cl._id} value={cl._id}>
              {cl.filename || "Untitled Cover Letter"}
            </option>
          ))}
        </select>
      </div>

      {/* Portfolio URL */}
      <div>
        <label className="block font-medium mb-1">Portfolio URL</label>
        <input
          type="text"
          placeholder="https://yourportfolio.com"
          className="border rounded px-3 py-2 w-full"
          value={config.portfolioUrl || ""}
          onChange={(e) => updatePortfolio(e.target.value)}
        />
      </div>

      <p className="text-xs text-gray-500">
        When this rule runs, your selected resume, cover letter and portfolio link
        will be saved to the selected job.
      </p>
    </div>
  );
}