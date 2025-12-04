import React, { useEffect, useState, useMemo } from "react";
import '../../styles/InterviewStyles/Analytics.css';

// ========================
// TYPES
// ========================
interface CoachingInsight {
  _id: string;
  createdAt: string;
  question: string;
  response: string;
  scores: {
    relevance: number;
    specificity: number;
    impact: number;
    clarity: number;
  };
}

interface PracticeSession {
  _id: string;
  createdAt: string;
  title: string;
  duration: number;
  completed: boolean;
  questions: {
    question: string;
    response: string;
    score: number;
    category: string;
  }[];
  averageScore: number;
  totalQuestions: number;
}

interface Job {
  _id: string;
  company: string;
  role: string;
}

interface ScheduledInterview {
  _id: string;
  type: string;
  date: string;
  outcome: "pending" | "passed" | "rejected" | "offer";
  createdAt: string;
}

interface AnalyticsItem {
  id: string;
  date: string;
  companyName: string;
  position: string;
  format: string;
  outcome: string;
  isPractice: boolean;
  overallScore: number;
  scores: any;
}

// ========================
// MAIN COMPONENT
// ========================

export default function InterviewAnalyticsDashboard() {
  const [interviews, setInterviews] = useState<AnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);

        // ============================
        // 1️⃣ FETCH COACHING INSIGHTS
        // ============================
        const coachingRes = await fetch("/api/coaching-insights");
        const coachingData: CoachingInsight[] = await coachingRes.json();

        const coachingItems: AnalyticsItem[] = coachingData.map((c) => ({
          id: c._id,
          date: c.createdAt,
          companyName: "Coaching Insight",
          position: c.question,
          format: "behavioral",
          outcome: "passed",
          isPractice: true,
          overallScore:
            (c.scores.relevance +
              c.scores.specificity +
              c.scores.impact +
              c.scores.clarity) /
            4,
          scores: {
            communication: c.scores.clarity,
            problemSolving: c.scores.impact,
            technical: c.scores.specificity,
            relevance: c.scores.relevance,
          },
        }));

        // ============================
        // 2️⃣ FETCH PRACTICE SESSIONS
        // ============================
        const practiceRes = await fetch(
          "/api/practice-sessions/sessions"
        );
        const practiceData: PracticeSession[] = await practiceRes.json();

        const practiceItems: AnalyticsItem[] = practiceData.map((p) => ({
          id: p._id,
          date: p.createdAt,
          companyName: "Practice Session",
          position: p.title,
          format: "technical",
          outcome: "passed",
          isPractice: true,
          overallScore: p.averageScore ?? 0,
          scores: {
            technical:
              p.questions.filter((q) => q.category === "technical").length > 0
                ? p.questions
                    .filter((q) => q.category === "technical")
                    .reduce((a, b) => a + b.score, 0) /
                  p.questions.filter((q) => q.category === "technical").length
                : 0,
            behavioral:
              p.questions.filter((q) => q.category === "behavioral").length > 0
                ? p.questions
                    .filter((q) => q.category === "behavioral")
                    .reduce((a, b) => a + b.score, 0) /
                  p.questions.filter((q) => q.category === "behavioral").length
                : 0,
          },
        }));

        // ============================
        // 3️⃣ FETCH JOBS
        // ============================
        const jobsRes = await fetch("/api/jobs");
        const jobs: Job[] = await jobsRes.json();

        // ============================
        // 4️⃣ FETCH SCHEDULED INTERVIEWS FOR EACH JOB
        // ============================
        const allScheduled: AnalyticsItem[] = [];

        for (const job of jobs) {
          const interviewRes = await fetch(`/api/jobs/${job._id}/interview`);
          const scheduled: ScheduledInterview[] = await interviewRes.json();

          scheduled.forEach((s) =>
            allScheduled.push({
              id: s._id,
              date: s.date,
              companyName: job.company,
              position: job.role,
              format: s.type,
              outcome: s.outcome,
              isPractice: false,
              overallScore: 0,
              scores: {},
            })
          );
        }

        // ============================
        // MERGE ALL SOURCES
        // ============================
        const merged = [
          ...coachingItems,
          ...practiceItems,
          ...allScheduled,
        ].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setInterviews(merged);
      } catch (err) {
        console.error(err);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // ============================
  // Derived Metrics
  // ============================

  const totalPractice = useMemo(
    () => interviews.filter((i) => i.isPractice).length,
    [interviews]
  );

  const totalRealInterviews = useMemo(
    () => interviews.filter((i) => !i.isPractice).length,
    [interviews]
  );

  const offerRate = useMemo(() => {
    const real = interviews.filter((i) => !i.isPractice);
    if (real.length === 0) return 0;
    return (
      (real.filter((i) => i.outcome === "offer").length / real.length) * 100
    );
  }, [interviews]);

  // ============================
  // UI
  // ============================

  if (loading) return <div className="loading">Loading analytics…</div>;

  return (
    <div className="analytics-container">
      <h1>Interview Analytics</h1>

      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Practice</h3>
          <p>{totalPractice}</p>
        </div>

        <div className="stat-card">
          <h3>Real Interviews</h3>
          <p>{totalRealInterviews}</p>
        </div>

        <div className="stat-card">
          <h3>Offer Rate</h3>
          <p>{offerRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="list-section">
        <h2>All Activity</h2>

        {interviews.map((i) => (
          <div key={i.id} className="list-item">
            <div>
              <strong>{i.companyName}</strong> – {i.position}
              <div className="date">{new Date(i.date).toLocaleString()}</div>
            </div>
            <div className="tag">{i.isPractice ? "Practice" : "Interview"}</div>
            <div className="tag outcome">{i.outcome}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
