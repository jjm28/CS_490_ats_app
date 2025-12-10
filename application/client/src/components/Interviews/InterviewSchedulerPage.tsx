// src/pages/InterviewSchedulerPage.tsx
import { useState, useEffect } from 'react';
import API_BASE from '../../utils/apiBase';
import InterviewScheduler from '../Jobs/InterviewScheduler';

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  interviews?: any[];
}

interface InterviewSchedulerPageProps {
  onBack: () => void;
}

export default function InterviewSchedulerPage({ onBack }: InterviewSchedulerPageProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Get user ID
      const authUser = localStorage.getItem('authUser');
      if (!authUser) {
        console.error('No auth user found');
        setLoading(false);
        return;
      }

      const user = JSON.parse(authUser);
      const userId = user?.user?._id || user?._id;

      if (!userId) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/jobs?userId=${userId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch jobs:', res.status);
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Interview Suite
        </button>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (selectedJobId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button
          onClick={() => setSelectedJobId(null)}
          className="mb-4 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Jobs
        </button>
        <InterviewScheduler jobId={selectedJobId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        ← Back to Interview Suite
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Interview Scheduler
        </h1>
        <p className="text-gray-600">
          Schedule and manage interviews for your job applications
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Jobs Yet</h2>
          <p className="text-gray-600">
            Add jobs to your tracker to start scheduling interviews
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              onClick={() => setSelectedJobId(job._id)}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {job.jobTitle}
              </h3>
              <p className="text-gray-600 mb-3">{job.company}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>📅</span>
                <span>
                  {job.interviews && job.interviews.length > 0
                    ? `${job.interviews.length} interview${job.interviews.length > 1 ? 's' : ''} scheduled`
                    : 'No interviews scheduled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}