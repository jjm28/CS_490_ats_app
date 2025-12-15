import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, TrendingUp, RefreshCw, Briefcase } from 'lucide-react';
import '../../styles/InterviewStyles/ResponseCoach.css';
import API_BASE from '../../utils/apiBase';

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
}

interface Question {
  question: string;
  category: 'technical' | 'behavioral' | 'general';
  jobTitle?: string;
  company?: string;
}

interface STARAdherence {
  situation: 'Yes' | 'No';
  task: 'Yes' | 'No';
  action: 'Yes' | 'No';
  result: 'Yes' | 'No';
  feedback: string;
}

interface FeedbackData {
  overallScore: number;
  relevanceScore: number;
  specificityScore: number;
  impactScore: number;
  starAdherence: STARAdherence;
  wordCount: number;
  estimatedTime: string;
  strengths: string[];
  weaknesses: string[];
  weakLanguagePatterns: string[];
  suggestions: string[];
  alternativeApproach: string;
  overallFeedback: string;
}

interface AnalysisResponse {
  message: string;
  analysis: FeedbackData;
  insight: any;
}

interface Session {
  id: number;
  question: string;
  response: string;
  feedback: FeedbackData;
  timestamp: string;
  attemptNumber: number;
}

interface ResponseCoachProps {
  onBack: () => void;
}

export default function InterviewCoach({ onBack }: ResponseCoachProps) {
  const [view, setView] = useState<'browse' | 'practice' | 'feedback'>('browse');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string>('');
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchQuestionsForJob(selectedJob);
    }
  }, [selectedJob]);

  useEffect(() => {
    filterQuestions();
  }, [selectedCategory, questions]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
        setLoadingJobs(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      setError('Failed to load jobs');
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchQuestionsForJob = async (jobId: string) => {
    setLoadingQuestions(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
        setLoadingQuestions(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/interview-questions/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      const allQuestions: Question[] = [];
      
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q: any) => {
          allQuestions.push({
            question: q.text,
            category: q.category,
            jobTitle: jobs.find(j => j._id === jobId)?.jobTitle,
            company: jobs.find(j => j._id === jobId)?.company
          });
        });
      }

      setQuestions(allQuestions);
      setFilteredQuestions(allQuestions);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    setFilteredQuestions(filtered);
  };

  const selectQuestion = (question: string) => {
    setCurrentQuestion(question);
    setResponse('');
    setFeedback(null);
    setView('practice');
  };
  
  const analyzeResponse = async () => {
    if (!response.trim()) {
      setError('Please enter a response');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/coaching-insights/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: currentQuestion,
          response: response
        })
      });

      const data: AnalysisResponse = await res.json();
      
      if (!res.ok) {
        throw new Error('API request failed');
      }
      
      const analysis: FeedbackData = data.analysis;
      
      const previousAttempts = sessions.filter(s => s.question === currentQuestion);
      const attemptNumber = previousAttempts.length + 1;

      const newSession: Session = {
        id: Date.now(),
        question: currentQuestion,
        response,
        feedback: analysis,
        timestamp: new Date().toLocaleString(),
        attemptNumber
      };
      
      setSessions(prev => [newSession, ...prev]);
      setFeedback(analysis);
      setView('feedback');
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const tryAgain = () => {
    setResponse('');
    setFeedback(null);
    setView('practice');
  };

  const backToBrowse = () => {
    setCurrentQuestion('');
    setResponse('');
    setFeedback(null);
    setView('browse');
  };

  const ScoreCircle: React.FC<{ score: number; label: string }> = ({ score, label }) => (
    <div className="score-circle-wrapper">
      <div className={`score-circle score-${Math.floor(score / 3)}`}>
        {score}
      </div>
      <p className="score-label">{label}</p>
    </div>
  );

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'technical': return 'technical';
      case 'behavioral': return 'behavioral';
      case 'general': return 'general';
      default: return '';
    }
  };

  const avgScore: string = sessions.length > 0 
    ? (sessions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / sessions.length).toFixed(1)
    : '0';

  // Browse View
  if (view === 'browse') {
    return (
      <div className="coach-container">
        <div className="coach-content">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <header className="coach-header">
            <h1 className="coach-title">AI Interview Coach</h1>
            <p className="coach-subtitle">Select a job and practice interview questions with instant AI feedback</p>
          </header>

          {sessions.length > 0 && (
            <div className="stats-card">
              <div className="stat-item">
                <TrendingUp className="stat-icon" size={28} />
                <div className="stat-content">
                  <p className="stat-label">Total Sessions</p>
                  <p className="stat-value">{sessions.length}</p>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-content">
                  <p className="stat-label">Average Score</p>
                  <p className="stat-value">{avgScore}<span className="stat-unit">/10</span></p>
                </div>
              </div>
            </div>
          )}

          <div className="job-selection-card">
            <div className="job-selection-header">
              <Briefcase size={24} color="#3b82f6" />
              <h2 className="job-selection-title">Select a Job</h2>
            </div>
            
            {loadingJobs ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">
                <p>No jobs found. Add a job first to generate interview questions.</p>
              </div>
            ) : (
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="job-select"
              >
                <option value="">-- Choose a job to practice --</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobTitle} at {job.company}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedJob && (
            <div className="questions-section">
              <div className="section-header">
                <h2 className="section-title">Interview Questions</h2>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="all">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="general">General</option>
                </select>
              </div>

              {loadingQuestions ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Generating questions...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="empty-state">
                  <p>No questions found for this category</p>
                </div>
              ) : (
                <div className="questions-grid">
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectQuestion(q.question)}
                      className="question-card"
                    >
                      <div className="question-card-header">
                        <span className={`category-badge ${getCategoryClass(q.category)}`}>
                          {q.category.charAt(0).toUpperCase() + q.category.slice(1)}
                        </span>
                      </div>
                      <p className="question-text">{q.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="custom-question-section">
            <h3 className="section-title">Or Enter Your Own Question</h3>
            <textarea
              placeholder="Type any interview question you want to practice..."
              rows={3}
              className="custom-question-input"
              onChange={(e) => setCurrentQuestion(e.target.value)}
              value={currentQuestion}
            />
            <button
              onClick={() => currentQuestion.trim() && selectQuestion(currentQuestion)}
              disabled={!currentQuestion.trim()}
              className="primary-button"
            >
              Practice This Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Practice View
  if (view === 'practice') {
    return (
      <div className="coach-container">
        <div className="coach-content narrow">
          <button onClick={backToBrowse} className="back-button">
            <ArrowLeft size={20} />
            Back to Questions
          </button>

          <div className="question-display-card">
            <h2 className="card-title">Interview Question</h2>
            <p className="question-display-text">{currentQuestion}</p>
          </div>

          <div className="response-card">
            <h2 className="card-title">Your Response</h2>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response here. Try to use the STAR method: Situation, Task, Action, Result..."
              rows={14}
              className="response-textarea"
            />

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={analyzeResponse}
              disabled={loading}
              className="primary-button"
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '20px', height: '20px' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Get AI Feedback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Feedback View
  if (view === 'feedback' && feedback) {
    return (
      <div className="coach-container">
        <div className="coach-content">
          <div className="feedback-header">
            <button onClick={backToBrowse} className="back-button">
              <ArrowLeft size={20} />
              Back to Questions
            </button>
            <button onClick={tryAgain} className="secondary-button">
              <RefreshCw size={20} />
              Try Again
            </button>
          </div>

          <div className="feedback-card">
            <h2 className="card-title">Analysis Results</h2>
            
            <div className="scores-grid">
              <ScoreCircle score={feedback.overallScore} label="Overall" />
              <ScoreCircle score={feedback.relevanceScore} label="Relevance" />
              <ScoreCircle score={feedback.specificityScore} label="Specificity" />
              <ScoreCircle score={feedback.impactScore} label="Impact" />
            </div>

            <div className="feedback-summary">
              <h3 className="summary-title">Summary</h3>
              <p>{feedback.overallFeedback}</p>
            </div>

            <div className="feedback-grid">
              <div className="feedback-column strengths">
                <h4>✓ Strengths</h4>
                <ul className="feedback-list">
                  {feedback.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="feedback-column weaknesses">
                <h4>! Areas to Improve</h4>
                <ul className="feedback-list">
                  {feedback.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="feedback-timing">
              <strong>{feedback.wordCount}</strong> words · <strong>{feedback.estimatedTime}</strong> speaking time
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}