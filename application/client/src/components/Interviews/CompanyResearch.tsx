// ResearchDashboard.tsx
import { useEffect, useState } from 'react';

type CompanyGroup = {
  name: string;
  jobs: Job[];
  hasResearch: boolean;
};

export default function ResearchDashboard() {
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);

  useEffect(() => {
    // 1. Fetch all jobs
    const fetchJobs = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const jobs: Job[] = await res.json();

      // 2. Group by company
      const grouped = jobs.reduce((acc, job) => {
        acc[job.company] = acc[job.company] || [];
        acc[job.company].push(job);
        return acc;
      }, {} as Record<string, Job[]>);

      // 3. Check research status for each
      const companyList = await Promise.all(
        Object.entries(grouped).map(async ([name, jobs]) => {
          const researchRes = await fetch(`/api/research/${encodeURIComponent(name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return {
            name,
            jobs,
            hasResearch: researchRes.ok
          };
        })
      );

      setCompanies(companyList);
    };

    fetchJobs();
  }, []);

  const handleGenerate = async (company: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/research/${encodeURIComponent(company)}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    // Optionally refetch or optimistic update
  };

  return (
    <div className="research-dashboard">
      <h1>Interview Research</h1>
      {companies.map(({ name, jobs, hasResearch }) => (
        <div key={name} className="company-section">
          <h2>{name} <span>({jobs.length} roles)</span></h2>
          <ul>
            {jobs.map(job => (
              <li key={job._id}>{job.jobTitle}</li>
            ))}
          </ul>
          {hasResearch ? (
            <button onClick={() => window.location.href = `/research/${name}`}>
              View Research
            </button>
          ) : (
            <button onClick={() => handleGenerate(name)}>
              Generate Research
            </button>
          )}
        </div>
      ))}
    </div>
  );
}