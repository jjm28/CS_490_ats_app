import { useState, useEffect } from "react";
import API_BASE from "../../utils/apiBase";
import InterviewFollowUp from "../../components/Interviews/InterviewFollowUp";

interface Job {
  _id: string;
  company: string;
  jobTitle: string;
  interviews?: Interview[];
}

interface Interview {
  _id: string;
  type: string;
  date: Date;
  interviewer?: string;
  contactInfo?: string;
  followUps?: any[];
}

interface InterviewFollowUpPageProps {
  onBack: () => void;
}

export default function InterviewFollowUpPage({ onBack }: InterviewFollowUpPageProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // Filter jobs that have interviews
      const jobsWithInterviews = data.filter(
        (job: Job) => job.interviews && job.interviews.length > 0
      );
      
      setJobs(jobsWithInterviews);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const refetchJob = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${selectedJob._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedJob(data);
      
      // Update selected interview with latest data
      if (selectedInterview) {
        const updatedInterview = data.interviews?.find(
          (i: Interview) => i._id === selectedInterview._id
        );
        if (updatedInterview) {
          setSelectedInterview(updatedInterview);
        }
      }
    } catch (err) {
      console.error("Error refetching job:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E3B43] text-white p-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          ← Back to Interview Suite
        </button>
        <div className="text-center">Loading interviews...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E3B43] text-white p-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        ← Back to Interview Suite
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📧 Interview Follow-Up</h1>
        <p className="text-white/70">
          Send professional follow-up emails after your interviews
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto space-y-6">
        {!selectedJob ? (
          /* Job Selection */
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select a Job</h2>
            
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <p className="mb-2">📭 No interviews found</p>
                <p className="text-sm">Schedule interviews in the Jobs page first</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <button
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="w-full text-left bg-white/10 hover:bg-white/15 rounded-lg p-4 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{job.jobTitle}</h3>
                        <p className="text-sm text-white/70">{job.company}</p>
                      </div>
                      <div className="text-sm text-white/50">
                        {job.interviews?.length || 0} interview{job.interviews?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : !selectedInterview ? (
          /* Interview Selection */
          <div className="bg-white/5 rounded-lg p-6">
            <button
              onClick={() => setSelectedJob(null)}
              className="mb-4 text-sm text-white/70 hover:text-white"
            >
              ← Back to jobs
            </button>
            
            <h2 className="text-xl font-semibold mb-2">
              {selectedJob.jobTitle} at {selectedJob.company}
            </h2>
            <p className="text-white/70 mb-4">Select an interview:</p>
            
            <div className="space-y-3">
              {selectedJob.interviews?.map((interview) => {
                const interviewDate = new Date(interview.date);
                const daysSince = Math.floor(
                  (Date.now() - interviewDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const isPast = daysSince >= 0;
                
                return (
                  <button
                    key={interview._id}
                    onClick={() => setSelectedInterview(interview)}
                    className="w-full text-left bg-white/10 hover:bg-white/15 rounded-lg p-4 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">
                            {interview.type} Interview
                          </span>
                          {isPast ? (
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                              {daysSince === 0 ? 'Today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}
                            </span>
                          ) : (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/70">
                          {interviewDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {interview.interviewer && (
                          <p className="text-xs text-white/50 mt-1">
                            With {interview.interviewer}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {interview.followUps && interview.followUps.length > 0 && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            {interview.followUps.length} sent
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Follow-Up Component */
          <div className="bg-white rounded-lg p-6 text-gray-900">
            <button
              onClick={() => setSelectedInterview(null)}
              className="mb-4 text-sm text-gray-700 hover:text-gray-900"
            >
              ← Back to interviews
            </button>
            
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {selectedJob.jobTitle} at {selectedJob.company}
            </h2>
            <p className="text-gray-700 mb-4">
              {new Date(selectedInterview.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            
            <InterviewFollowUp
              jobId={selectedJob._id}
              interviewId={selectedInterview._id}
              interviewerEmail={selectedInterview.contactInfo}
              interviewDate={selectedInterview.date}
              existingFollowUps={selectedInterview.followUps}
              onFollowUpUpdate={refetchJob}
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}