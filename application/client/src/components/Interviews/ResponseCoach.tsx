import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, TrendingUp, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';

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

export default function InterviewCoach() {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    star: false,
    strengths: false,
    weaknesses: false,
    suggestions: false,
    alternative: false
  });

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

      const res = await fetch(`http://localhost:5050/api/jobs`, {
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

      const res = await fetch(`http://localhost:5050/api/interview-questions/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      // Transform the questions from the API response
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

      const res = await fetch(`http://localhost:5050/api/coaching-insights/analyze`, {
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
    setActiveTab('overview');
    setExpandedSections({
      star: false,
      strengths: false,
      weaknesses: false,
      suggestions: false,
      alternative: false
    });
  };

  const backToBrowse = () => {
    setCurrentQuestion('');
    setResponse('');
    setFeedback(null);
    setView('browse');
    setActiveTab('overview');
    setExpandedSections({
      star: false,
      strengths: false,
      weaknesses: false,
      suggestions: false,
      alternative: false
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const ScoreCircle: React.FC<{ score: number; label: string }> = ({ score, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        background: score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444',
        color: 'white'
      }}>
        {score}
      </div>
      <p style={{ fontSize: '14px', color: '#666' }}>{label}</p>
    </div>
  );

  const getCategoryClass = (category: string) => {
    const colors = {
      technical: '#3b82f6',
      behavioral: '#8b5cf6',
      general: '#06b6d4'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  const getImprovementData = () => {
    const questionSessions = sessions
      .filter(s => s.question === currentQuestion)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
    
    if (questionSessions.length < 2) return null;

    const firstScore = questionSessions[0].feedback.overallScore;
    const latestScore = questionSessions[questionSessions.length - 1].feedback.overallScore;
    const improvement = latestScore - firstScore;

    return {
      attempts: questionSessions.length,
      improvement,
      firstScore,
      latestScore,
      scores: questionSessions.map(s => s.feedback.overallScore)
    };
  };

  const avgScore: string = sessions.length > 0 
    ? (sessions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / sessions.length).toFixed(1)
    : '0';

  // Browse View
  if (view === 'browse') {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>AI Interview Coach</h1>
          <p style={{ color: '#666' }}>Select a job and practice interview questions with instant AI feedback</p>
        </header>

        {sessions.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <TrendingUp size={28} color="#10b981" />
              <div>
                <p style={{ color: '#666', fontSize: '14px' }}>Total Sessions</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{sessions.length}</p>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '32px' }}>
              <p style={{ color: '#666', fontSize: '14px' }}>Average Score</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {avgScore}<span style={{ fontSize: '16px', color: '#666' }}>/10</span>
              </p>
            </div>
          </div>
        )}

        {/* Job Selection */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Briefcase size={24} color="#3b82f6" />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Select a Job</h2>
          </div>
          
          {loadingJobs ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
              <p style={{ marginTop: '12px', color: '#666' }}>Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              <p>No jobs found. Add a job first to generate interview questions.</p>
            </div>
          ) : (
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
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
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Interview Questions</h2>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="general">General</option>
              </select>
            </div>

            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e5e7eb',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ marginTop: '12px', color: '#666' }}>Generating questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <p>No questions found for this category</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectQuestion(q.question)}
                    style={{
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ':hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getCategoryClass(q.category) + '20',
                        color: getCategoryClass(q.category)
                      }}>
                        {q.category.charAt(0).toUpperCase() + q.category.slice(1)}
                      </span>
                    </div>
                    <p style={{ fontSize: '15px', lineHeight: '1.5', color: '#333' }}>{q.question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Or Enter Your Own Question</h3>
          <textarea
            placeholder="Type any interview question you want to practice..."
            rows={3}
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '15px',
              resize: 'vertical',
              marginBottom: '12px'
            }}
          />
          <button
            onClick={() => currentQuestion.trim() && selectQuestion(currentQuestion)}
            disabled={!currentQuestion.trim()}
            style={{
              padding: '12px 24px',
              background: currentQuestion.trim() ? '#3b82f6' : '#e5e7eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: currentQuestion.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Practice This Question
          </button>
        </div>
      </div>
    );
  }

  // Practice View
  if (view === 'practice') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <button onClick={backToBrowse} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '24px'
        }}>
          <ArrowLeft size={20} />
          Back to Questions
        </button>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Interview Question</h2>
          <p style={{ fontSize: '17px', lineHeight: '1.6', color: '#333' }}>{currentQuestion}</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Your Response</h2>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response here. Try to use the STAR method: Situation, Task, Action, Result..."
            rows={14}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '15px',
              lineHeight: '1.6',
              resize: 'vertical',
              marginBottom: '16px'
            }}
          />

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              marginBottom: '16px'
            }}>
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={analyzeResponse}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
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

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Feedback View - simplified for artifact
  if (view === 'feedback' && feedback) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={backToBrowse} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <ArrowLeft size={20} />
            Back to Questions
          </button>
          <button onClick={tryAgain} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <RefreshCw size={20} />
            Try Again
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Analysis Results</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '32px' }}>
            <ScoreCircle score={feedback.overallScore} label="Overall" />
            <ScoreCircle score={feedback.relevanceScore} label="Relevance" />
            <ScoreCircle score={feedback.specificityScore} label="Specificity" />
            <ScoreCircle score={feedback.impactScore} label="Impact" />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Summary</h3>
            <p style={{ lineHeight: '1.6', color: '#333' }}>{feedback.overallFeedback}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#10b981' }}>✓ Strengths</h4>
              <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx} style={{ color: '#333' }}>• {strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#ef4444' }}>! Areas to Improve</h4>
              <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
                {feedback.weaknesses.map((weakness, idx) => (
                  <li key={idx} style={{ color: '#333' }}>• {weakness}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              <strong>{feedback.wordCount}</strong> words · <strong>{feedback.estimatedTime}</strong> speaking time
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}