// src/pages/Questions.tsx
import { useEffect, useState } from "react";
import "../../styles/Questions.css";

type Job = {
  _id: string;
  jobTitle: string;
  company: string;
};

type Question = {
  id: string;
  text: string;
  category: 'behavioral' | 'technical' | 'situational';
  difficulty: 'entry' | 'mid' | 'senior';
  skills: string[];
  companySpecific?: boolean;
};

type Insights = {
  questions: Question[];
  error?: string;
};

type QuestionsProps = {
  onBack?: () => void;
};

const CATEGORY_LABELS: Record<Question['category'], string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  situational: 'Situational',
};

const CATEGORY_COLORS: Record<Question['category'], string> = {
  behavioral: '#4A90E2',
  technical: '#50C878',
  situational: '#FFA500',
};

// Enhanced STAR Guide with example
const STARGuide = () => (
  <div className="star-guide">
    <div className="star-guide-title">
      💡 Use the STAR Method
    </div>
    <div className="star-guide-content">
      <strong>S</strong>ituation • <strong>T</strong>ask • <strong>A</strong>ction • <strong>R</strong>esult
    </div>
    <div className="star-example">
      <strong>Example:</strong> "In my previous role <em>(Situation)</em>, I needed to reduce page load time <em>(Task)</em>. 
      I implemented lazy loading and code splitting <em>(Action)</em>, which decreased load time by 40% <em>(Result)</em>."
    </div>
  </div>
);

function QuestionCard({
  question,
  index,
  jobId,
}: {
  question: Question;
  index: number;
  jobId: string;
}) {
  const storageKey = `practice_${jobId}_${question.id}`;
  const [response, setResponse] = useState(() => {
    return localStorage.getItem(storageKey) || '';
  });
  const [isEditing, setIsEditing] = useState(false);
  const practiced = !!response.trim();
  
  const saveResponse = () => {
    localStorage.setItem(storageKey, response);
    setIsEditing(false);
  };

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResponse(e.target.value);
  };

  return (
    <div className={`question-card ${practiced ? 'practiced' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'start', gap: '1.25rem' }}>
        <div className="question-number">
          Q{index}
        </div>
        
        <div className="question-content">
          <div className="question-tags">
            <span className="tag tag-difficulty">{question.difficulty}</span>
            {question.skills.map((skill) => (
              <span key={skill} className="tag tag-skill">
                {skill}
              </span>
            ))}
            {question.companySpecific && (
              <span className="tag tag-company-specific">
                Company-Specific
              </span>
            )}
          </div>

          <p className="question-text">{question.text}</p>

          {/* STAR Guide for behavioral questions */}
          {question.category === 'behavioral' && !isEditing && !practiced && (
            <STARGuide />
          )}

          {/* Practice Section */}
          <div className="practice-section">
            {isEditing ? (
              <div>
                <textarea
                  value={response}
                  onChange={handleResponseChange}
                  placeholder="Write your STAR response here...&#10;&#10;Situation: ...&#10;Task: ...&#10;Action: ...&#10;Result: ..."
                  className="practice-textarea"
                />
                <div className="practice-buttons">
                  <button onClick={saveResponse} className="btn btn-primary">
                    💾 Save Response
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="practice-section-centered">
                <button
                  onClick={() => setIsEditing(true)}
                  className={`practice-trigger ${practiced ? 'practiced' : 'not-practiced'}`}
                >
                  {practiced ? (
                    <>
                      <span>✅</span>
                      <span>Practiced – Edit Response</span>
                    </>
                  ) : (
                    <>
                      <span>✏️</span>
                      <span>Practice This Question</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewQuestionsOnly({ onBack }: QuestionsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Question['category'] | 'all'>('all');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token")?.trim();
        const res = await fetch("/api/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setJobs([]);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setQuestions([]);
      setError(null);
      return;
    }

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token")?.trim();
        if (!token) throw new Error("No auth token");

        const res = await fetch(`/api/interview-questions/${selectedJobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load insights");
        }

        const data: Insights = await res.json();
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } catch (err: any) {
        console.error("Error fetching questions:", err);
        setError(err.message || "Unable to load questions");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedJobId]);

  const grouped = questions.reduce(
    (acc, q) => {
      acc[q.category].push(q);
      return acc;
    },
    { behavioral: [], technical: [], situational: [] } as Record<
      Question['category'],
      Question[]
    >
  );

  const filteredQuestions = categoryFilter === 'all' 
    ? questions 
    : questions.filter(q => q.category === categoryFilter);

  const filteredGrouped = filteredQuestions.reduce(
    (acc, q) => {
      acc[q.category].push(q);
      return acc;
    },
    { behavioral: [], technical: [], situational: [] } as Record<
      Question['category'],
      Question[]
    >
  );

  const selectedJob = jobs.find((j) => j._id === selectedJobId);

  return (
    <div className="questions-container">
      <div className="questions-content">
        {/* Back Button */}
        <button 
          onClick={onBack || (() => window.history.back())} 
          className="back-button"
        >
          <span>←</span>
          <span>Back to Overview</span>
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">
            Role Based Questions
          </h1>
        </div>

        {/* Job Selector */}
        <div className="job-selector-card">
          <label className="job-selector-label">
            Select a Job:
          </label>
          <select
            className="job-selector-select"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="">-- Choose a job --</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.jobTitle} – {job.company}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        {questions.length > 0 && (
          <div className="category-filter-card">
            <label className="category-filter-label">
              Filter by Category:
            </label>
            <div className="category-filter-buttons">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`category-filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                style={{
                  backgroundColor: categoryFilter === 'all' ? '#357266' : '#f0f7f5',
                  color: categoryFilter === 'all' ? 'white' : '#0E3B43',
                  border: categoryFilter === 'all' ? 'none' : '2px solid #6DA598',
                }}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setCategoryFilter('behavioral')}
                className={`category-filter-btn ${categoryFilter === 'behavioral' ? 'active' : ''}`}
                style={{
                  backgroundColor: categoryFilter === 'behavioral' ? '#4A90E2' : '#f0f7f5',
                  color: categoryFilter === 'behavioral' ? 'white' : '#0E3B43',
                  border: categoryFilter === 'behavioral' ? 'none' : '2px solid #6DA598',
                }}
              >
                💬 Behavioral ({grouped.behavioral.length})
              </button>
              <button
                onClick={() => setCategoryFilter('technical')}
                className={`category-filter-btn ${categoryFilter === 'technical' ? 'active' : ''}`}
                style={{
                  backgroundColor: categoryFilter === 'technical' ? '#50C878' : '#f0f7f5',
                  color: categoryFilter === 'technical' ? 'white' : '#0E3B43',
                  border: categoryFilter === 'technical' ? 'none' : '2px solid #6DA598',
                }}
              >
                💻 Technical ({grouped.technical.length})
              </button>
              <button
                onClick={() => setCategoryFilter('situational')}
                className={`category-filter-btn ${categoryFilter === 'situational' ? 'active' : ''}`}
                style={{
                  backgroundColor: categoryFilter === 'situational' ? '#FFA500' : '#f0f7f5',
                  color: categoryFilter === 'situational' ? 'white' : '#0E3B43',
                  border: categoryFilter === 'situational' ? 'none' : '2px solid #6DA598',
                }}
              >
                🎭 Situational ({grouped.situational.length})
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="state-card">
            <p className="loading-text">Loading questions...</p>
          </div>
        )}

        {error && (
          <div className="state-card">
            <p className="error-text">⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <div className="sections-container">
            {(['behavioral', 'technical', 'situational'] as const).map((cat) => {
              if (filteredGrouped[cat].length === 0) return null;
              
              // Number questions sequentially within each category
              let questionNumber = 1;
              
              return (
                <div key={cat} className="category-section">
                  <h2 className="category-title">
                    <span 
                      className="category-indicator"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    {CATEGORY_LABELS[cat]} Questions
                  </h2>
                  <div className="category-questions">
                    {filteredGrouped[cat].map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={questionNumber++}
                        jobId={selectedJobId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && questions.length === 0 && selectedJobId && (
          <div className="state-card">
            <p className="empty-text">
              No interview questions available for {selectedJob?.jobTitle} at {selectedJob?.company}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}