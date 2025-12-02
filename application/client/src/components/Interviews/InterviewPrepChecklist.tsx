import { useState, useEffect } from "react";
import API_BASE from "../../utils/apiBase";
import InterviewChecklist from "./InterviewChecklist";

interface UpcomingInterview {
  _id: string;
  jobId: string;
  company: string;
  jobTitle: string;
  type: string;
  date: string;
  interviewer?: string;
  locationOrLink?: string;
  preparationChecklist?: any;
  hasChecklist: boolean;
}

interface InterviewPrepChecklistProps {
  onBack: () => void;
}

export default function InterviewPrepChecklist({ onBack }: InterviewPrepChecklistProps) {
  const [interviews, setInterviews] = useState<UpcomingInterview[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  useEffect(() => {
    fetchUpcomingInterviews();
  }, []);

  const fetchUpcomingInterviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/interviews/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
        
        // Auto-select first interview if available
        if (data.length > 0) {
          setSelectedInterviewId(data[0]._id);
        }
      } else {
        console.error("Failed to fetch upcoming interviews");
      }
    } catch (err) {
      console.error("Error fetching upcoming interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedInterview = interviews.find(i => i._id === selectedInterviewId);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0E3B43",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: "2rem",
        boxSizing: "border-box",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "white",
          padding: "0.5rem 1rem",
          borderRadius: "20px",
          cursor: "pointer",
          fontSize: "0.9rem",
          marginBottom: "2rem",
        }}
      >
        ← Back to Overview
      </button>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        <span
          style={{
            display: "inline-block",
            marginBottom: "1rem",
            background: "rgba(255,255,255,0.1)",
            padding: "0.25rem 0.75rem",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        >
          Pre-Interview Prep
        </span>
        
        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem" }}>
          Preparation Checklist
        </h1>
        
        <p style={{ fontSize: "1.1rem", lineHeight: "1.7", opacity: 0.9, marginBottom: "2rem" }}>
          Get ready for your upcoming interviews with personalized preparation checklists
          tailored to each role and company.
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.7 }}>
            Loading interviews...
          </div>
        ) : interviews.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              No upcoming interviews scheduled
            </p>
            <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
              Schedule an interview from your job tracker to start preparing!
            </p>
          </div>
        ) : (
          <div>
            {/* Interview Selector */}
            <div style={{ marginBottom: "2rem" }}>
              <label
                htmlFor="interview-select"
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                Select an interview to prepare for:
              </label>
              <select
                id="interview-select"
                value={selectedInterviewId}
                onChange={(e) => setSelectedInterviewId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {interviews.map((interview) => (
                  <option
                    key={interview._id}
                    value={interview._id}
                    style={{ background: "#0E3B43", color: "white" }}
                  >
                    {interview.jobTitle} at {interview.company} -{" "}
                    {new Date(interview.date).toLocaleDateString()} at{" "}
                    {new Date(interview.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {interview.hasChecklist ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Interview Details */}
            {selectedInterview && (
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                  {selectedInterview.jobTitle} at {selectedInterview.company}
                </h2>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.9rem" }}>
                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(selectedInterview.date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong>{" "}
                    {new Date(selectedInterview.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div>
                    <strong>Type:</strong>{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {selectedInterview.type}
                    </span>
                  </div>
                  {selectedInterview.interviewer && (
                    <div>
                      <strong>Interviewer:</strong> {selectedInterview.interviewer}
                    </div>
                  )}
                  {selectedInterview.locationOrLink && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Location/Link:</strong>{" "}
                      <a
                        href={selectedInterview.locationOrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#60D5FF", textDecoration: "underline" }}
                      >
                        {selectedInterview.locationOrLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checklist Component */}
            {selectedInterview && (
              <div
                style={{
                  background: "white",
                  color: "#0E3B43",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <InterviewChecklist
                  jobId={selectedInterview.jobId}
                  interviewId={selectedInterview._id}
                  checklist={selectedInterview.preparationChecklist}
                  onChecklistUpdate={fetchUpcomingInterviews}
                  compact={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}