// src/components/Scheduling/Scheduling.tsx
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Edit2, Video, Phone, Users, Calendar } from "lucide-react";
import API_BASE from "../../utils/apiBase";
import InterviewScheduler from "../Jobs/InterviewScheduler";

export default function Scheduling({ onBack }: { onBack?: () => void }) {
  // Each interview must carry its jobId so we can edit it
  const [interviews, setInterviews] = useState<
    { _id: string; jobId: string; jobTitle?: string } & Record<string, any>
  >([]);
  
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  const getInterviewIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "phone":
        return <Phone className="w-4 h-4" />;
      case "in-person":
        return <Users className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const fetchAllInterviews = async () => {
    try {
      setLoading(true);
      // 1. Get all user jobs (only need _id and title)
      const jobsRes = await fetch(`${API_BASE}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!jobsRes.ok) throw new Error("Failed to fetch jobs");
      const jobs = await jobsRes.json();
      
      // 2. Fetch interviews for each job
      const allInterviews = [];
      for (const job of jobs) {
        const res = await fetch(`${API_BASE}/api/jobs/${job._id}/interview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const interviewList = await res.json();
          for (const interview of interviewList) {
            allInterviews.push({
              ...interview,
              jobId: job._id,        // critical for editing
              jobTitle: job.jobTitle,
              company: job.company,   // for display only
            });
          }
        }
      }
      // 3. Sort by date (newest first)
      allInterviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInterviews(allInterviews);
    } catch (err) {
      console.error("Error loading interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAllInterviews();
  }, [token]);

  // Show InterviewScheduler when a job is selected
  if (selectedJobId) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <button
          onClick={() => setSelectedJobId(null)}
          className="group flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to All Interviews</span>
        </button>
        <InterviewScheduler jobId={selectedJobId} />
      </div>
    );
  }

  // Main view: list all interviews
  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ backgroundColor: '#f5f5f0' }}>
      <div className="flex items-center justify-between mb-8">
        {onBack && (
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-full shadow-sm border border-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Overview</span>
          </button>
        )}
        
        <h2 className="text-3xl font-bold text-gray-900 flex-1 text-center">Scheduled Interviews</h2>
        
        {/* Spacer to keep title centered */}
        {onBack && <div className="w-[180px]"></div>}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p>You don't have any scheduled interviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((i) => (
            <div 
              key={i._id} 
              className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {i.jobTitle && i.company 
                        ? `${i.jobTitle} – ${i.company}`
                        : i.jobTitle || i.company || "Job"}
                    </h4>
                    
                    <button
                      onClick={() => setSelectedJobId(i.jobId)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors ml-4"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="font-medium">
                      {new Date(i.date).toLocaleString()}
                    </span>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-1.5 capitalize">
                      {getInterviewIcon(i.type || "phone")}
                      <span>{i.type || "Interview"}</span>
                    </div>
                  </div>
                  
                  {i.location && (
                    <p className="text-sm text-gray-600 mt-2">📍 {i.location}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}