import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, TrendingUp, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import '../../styles/InterviewStyles/ResponseCoach.css';

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string>('');
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    star: false,
    strengths: false,
    weaknesses: false,
    suggestions: false,
    alternative: false
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [selectedCategory, questions]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
        setLoadingQuestions(false);
        return;
      }

      const res = await fetch(`http://localhost:5050/api/interview-questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      const allQuestions: Question[] = [];
      
      data.forEach((item: any) => {
        item.technicalQuestions?.forEach((q: any) => {
          allQuestions.push({
            question: q.question,
            category: 'technical',
            jobTitle: item.jobTitle,
            company: item.company
          });
        });
        item.behavioralQuestions?.forEach((q: any) => {
          allQuestions.push({
            question: q.question,
            category: 'behavioral',
            jobTitle: item.jobTitle,
            company: item.company
          });
        });
        item.generalQuestions?.forEach((q: any) => {
          allQuestions.push({
            question: q.question,
            category: 'general',
            jobTitle: item.jobTitle,
            company: item.company
          });
        });
      });

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
  const saveCoachingInsight = async (
    question: string,
    response: string,
    feedback: FeedbackData
    ) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        await fetch(`http://localhost:5050/api/coaching-insights`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            question,
            response,
            scores: {
            relevance: feedback.relevanceScore,
            specificity: feedback.specificityScore,
            impact: feedback.impactScore,
            clarity: feedback.overallScore, // or create its own if needed
            },
            star: {
            situation: feedback.starAdherence.situation,
            task: feedback.starAdherence.task,
            action: feedback.starAdherence.action,
            result: feedback.starAdherence.result,
            },
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            alternativeApproach: feedback.alternativeApproach,
        }),
        });
    } catch (err) {
        console.error("Failed to save coaching insight:", err);
    }
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

      const res = await fetch(`http://localhost:5050/api/interview-questions/analyze`, {
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

      const analysis: FeedbackData = await res.json();
      
      if (!res.ok) {
        throw new Error(analysis.error || 'API request failed');
      }
      
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
      await saveCoachingInsight(currentQuestion, response, analysis);
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
    <div className="score-circle-wrapper">
      <div className={`score-circle score-${Math.floor(score / 3)}`}>
        {score}
      </div>
      <p className="score-label">{label}</p>
    </div>
  );

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'technical': return 'category-technical';
      case 'behavioral': return 'category-behavioral';
      case 'general': return 'category-general';
      default: return 'category-default';
    }
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
      <div className="coach-container">
        <div className="coach-content">
          <header className="coach-header">
            <h1 className="coach-title">AI Interview Coach</h1>
            <p className="coach-subtitle">Select a question to practice and get instant feedback</p>
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

          <div className="questions-section">
            <div className="section-header">
              <h2 className="section-title">Question Bank</h2>
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
                <p>Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="empty-state">
                <p>No questions found</p>
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
                      {q.jobTitle && (
                        <span className="job-title">{q.jobTitle}</span>
                      )}
                    </div>
                    <p className="question-text">{q.question}</p>
                    {q.company && (
                      <p className="company-name">{q.company}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                  <div className="button-spinner" />
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
    const improvementData = getImprovementData();

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

          {improvementData && (
            <div className="progress-card">
              <h3 className="card-title">Progress Tracking</h3>
              <div className="progress-stats">
                <div className="progress-stat">
                  <p className="progress-label">Attempts</p>
                  <p className="progress-value">{improvementData.attempts}</p>
                </div>
                <div className="progress-stat">
                  <p className="progress-label">First Score</p>
                  <p className="progress-value">{improvementData.firstScore}/10</p>
                </div>
                <div className="progress-stat">
                  <p className="progress-label">Latest Score</p>
                  <p className="progress-value">{improvementData.latestScore}/10</p>
                </div>
                <div className="progress-stat">
                  <p className="progress-label">Improvement</p>
                  <p className={`progress-value ${improvementData.improvement >= 0 ? 'positive' : 'negative'}`}>
                    {improvementData.improvement >= 0 ? '+' : ''}{improvementData.improvement}
                  </p>
                </div>
              </div>
              <div className="progress-chart">
                <p className="chart-label">Score History</p>
                <div className="chart-bars">
                  {improvementData.scores.map((score, idx) => (
                    <div key={idx} className="chart-bar-wrapper">
                      <div className="chart-bar" style={{ height: `${score * 10}%` }} />
                      <p className="chart-bar-label">{idx + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="feedback-tabs">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'detailed' ? 'active' : ''}`}
              onClick={() => setActiveTab('detailed')}
            >
              Detailed Analysis
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="feedback-overview-card">
                <div className="scores-grid-compact">
                  <ScoreCircle score={feedback.overallScore} label="Overall" />
                  <ScoreCircle score={feedback.relevanceScore} label="Relevance" />
                  <ScoreCircle score={feedback.specificityScore} label="Specificity" />
                  <ScoreCircle score={feedback.impactScore} label="Impact" />
                </div>

                <div className="overall-feedback-highlight">
                  <h3 className="highlight-title">Summary</h3>
                  <p>{feedback.overallFeedback}</p>
                </div>

                <div className="quick-insights">
                  <div className="insight-column">
                    <h4 className="insight-title">✓ Key Strengths</h4>
                    <ul className="insight-list">
                      {feedback.strengths.slice(0, 2).map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="insight-column">
                    <h4 className="insight-title">! Priority Improvements</h4>
                    <ul className="insight-list">
                      {feedback.weaknesses.slice(0, 2).map((weakness, idx) => (
                        <li key={idx}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="timing-quick">
                  <strong>{feedback.wordCount}</strong> words · <strong>{feedback.estimatedTime}</strong> speaking time
                </div>

                <p className="view-details-hint">
                  Switch to "Detailed Analysis" tab for in-depth feedback →
                </p>
              </div>
            </>
          )}

          {/* Detailed Tab */}
          {activeTab === 'detailed' && (
            <>
              <div className="feedback-context-card">
                <h2 className="card-title">Your Answer</h2>
                <div className="context-question-box">
                  <strong>Q:</strong> {currentQuestion}
                </div>
                <div className="context-response">{response}</div>
              </div>

              <div className="detailed-feedback-card">
                {/* STAR Analysis - Collapsible */}
                <div className="collapsible-section">
                  <button 
                    className="section-header-button"
                    onClick={() => toggleSection('star')}
                  >
                    <h3 className="subsection-title">STAR Method Analysis</h3>
                    {expandedSections.star ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  
                  <div className="star-indicators-inline">
                    <div className={`star-indicator-mini ${feedback.starAdherence.situation === 'Yes' ? 'yes' : 'no'}`}>
                      S
                    </div>
                    <div className={`star-indicator-mini ${feedback.starAdherence.task === 'Yes' ? 'yes' : 'no'}`}>
                      T
                    </div>
                    <div className={`star-indicator-mini ${feedback.starAdherence.action === 'Yes' ? 'yes' : 'no'}`}>
                      A
                    </div>
                    <div className={`star-indicator-mini ${feedback.starAdherence.result === 'Yes' ? 'yes' : 'no'}`}>
                      R
                    </div>
                  </div>

                  {expandedSections.star && (
                    <div className="section-content">
                      <div className="star-indicators">
                        <div className="star-indicator">
                          {feedback.starAdherence.situation === 'Yes' ? 
                            <CheckCircle className="star-icon yes" size={18} /> : 
                            <XCircle className="star-icon no" size={18} />
                          }
                          <span>Situation</span>
                        </div>
                        <div className="star-indicator">
                          {feedback.starAdherence.task === 'Yes' ? 
                            <CheckCircle className="star-icon yes" size={18} /> : 
                            <XCircle className="star-icon no" size={18} />
                          }
                          <span>Task</span>
                        </div>
                        <div className="star-indicator">
                          {feedback.starAdherence.action === 'Yes' ? 
                            <CheckCircle className="star-icon yes" size={18} /> : 
                            <XCircle className="star-icon no" size={18} />
                          }
                          <span>Action</span>
                        </div>
                        <div className="star-indicator">
                          {feedback.starAdherence.result === 'Yes' ? 
                            <CheckCircle className="star-icon yes" size={18} /> : 
                            <XCircle className="star-icon no" size={18} />
                          }
                          <span>Result</span>
                        </div>
                      </div>
                      <p className="star-feedback">{feedback.starAdherence.feedback}</p>
                    </div>
                  )}
                </div>

                {/* Strengths - Collapsible */}
                <div className="collapsible-section">
                  <button 
                    className="section-header-button"
                    onClick={() => toggleSection('strengths')}
                  >
                    <h3 className="subsection-title">Strengths ({feedback.strengths.length})</h3>
                    {expandedSections.strengths ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedSections.strengths && (
                    <div className="section-content">
                      <ul className="feedback-list strengths">
                        {feedback.strengths.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Weaknesses - Collapsible */}
                <div className="collapsible-section">
                  <button 
                    className="section-header-button"
                    onClick={() => toggleSection('weaknesses')}
                  >
                    <h3 className="subsection-title">Areas to Improve ({feedback.weaknesses.length})</h3>
                    {expandedSections.weaknesses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedSections.weaknesses && (
                    <div className="section-content">
                      <ul className="feedback-list weaknesses">
                        {feedback.weaknesses.map((weakness, idx) => (
                          <li key={idx}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Weak Language Patterns */}
                {feedback.weakLanguagePatterns.length > 0 && (
                  <div className="weak-patterns-compact">
                    <h4 className="compact-title">Weak Language Patterns</h4>
                    <div className="pattern-tags">
                      {feedback.weakLanguagePatterns.map((pattern, idx) => (
                        <span key={idx} className="pattern-tag">{pattern}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions - Collapsible */}
                <div className="collapsible-section">
                  <button 
                    className="section-header-button"
                    onClick={() => toggleSection('suggestions')}
                  >
                    <h3 className="subsection-title">Suggestions ({feedback.suggestions.length})</h3>
                    {expandedSections.suggestions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedSections.suggestions && (
                    <div className="section-content">
                      <ul className="feedback-list suggestions">
                        {feedback.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Alternative Approach - Collapsible */}
                <div className="collapsible-section">
                  <button 
                    className="section-header-button"
                    onClick={() => toggleSection('alternative')}
                  >
                    <h3 className="subsection-title">Alternative Approach</h3>
                    {expandedSections.alternative ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedSections.alternative && (
                    <div className="section-content">
                      <div className="alternative-approach">
                        <p>{feedback.alternativeApproach}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="action-buttons">
            <button onClick={tryAgain} className="primary-button">
              <RefreshCw size={20} />
              Try This Question Again
            </button>
            <button onClick={backToBrowse} className="secondary-button">
              Practice New Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}