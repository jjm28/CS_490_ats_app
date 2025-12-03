// MockPractice.tsx - With length guidance and better pacing
import React, { useState, useRef, useEffect } from 'react';

import { useNavigate } from "react-router-dom";
import TechnicalPrep from "./TechnicalPrep";

import '../../styles/InterviewStyles/MockPractice.css';

type InterviewStep =
  | 'type-select'
  | 'job-select'
  | 'interview'
  | 'technical-prep'
  | 'summary';

interface Question {
  id: number;
  text: string;
  type: 'behavioral' | 'technical';
  targetWords?: number; // Recommended word count
  followUp?: string;
  guidance?: string;
}

interface SavedJob {
  _id: string;
  jobTitle: string;
  company: string;
}

interface QuestionResponse {
  question: string;
  response: string;
  aiFeedback?: string;
  score?: number;
  category: string;
}

interface MockPracticeProps {
  onBack: () => void;
}

const MockPractice: React.FC<MockPracticeProps> = ({ onBack }) => {
  const [step, setStep] = useState<InterviewStep>('type-select');
  const [interviewType, setInterviewType] = useState<'behavioral' | 'technical'>('behavioral');
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [response, setResponse] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionResults, setSessionResults] = useState<QuestionResponse[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [response]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/jobs', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSavedJobs(data))
      .catch(err => console.error('Failed to load jobs:', err));
  }, []);

  const generateQuestionsWithGemini = async (
    jobTitle: string,
    company: string,
    type: 'behavioral' | 'technical'
  ): Promise<string[]> => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/interview-insights/generate-questions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobTitle, company, type })
    });

    if (!response.ok) throw new Error('Failed to generate questions');

    const data = await response.json();
    return data.questions;
  };

  const handleStartWithJob = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedJobId) return;

    const job = savedJobs.find(j => j._id === selectedJobId);
    if (!job) return;

    setRole(job.jobTitle);
    setCompany(job.company);
    // ⭐ ADD THIS ⭐
    if (interviewType === 'technical') {
      setStep('technical-prep');
      return;
    }
    try {
      const generatedQuestions = await generateQuestionsWithGemini(job.jobTitle, job.company, interviewType);
      
      // Limit to 5 questions for easier review
      const limitedQuestions = generatedQuestions.slice(0, 5);
      
      const newQuestions: Question[] = limitedQuestions.map((text, i) => ({
        id: i + 1,
        text,
        type: interviewType,
        targetWords: interviewType === 'behavioral' ? 100 : 75, // Target length
        guidance: interviewType === 'behavioral' 
          ? 'Use the STAR method: Situation, Task, Action, Result'
          : 'Explain your thought process step-by-step'
      }));

      setQuestions(newQuestions);
      setResponses(new Array(newQuestions.length).fill(''));
      setSessionStartTime(Date.now());
      setStep('interview');
    } catch (err) {
      console.error('Failed to generate questions, using defaults:', err);

      const defaultBehavioral: Question[] = [
        { 
          id: 1, 
          text: 'Tell me about yourself.', 
          type: 'behavioral',
          targetWords: 100,
          guidance: 'Focus on: education → relevant experience → why this role (30-45 seconds)'
        },
        { 
          id: 2, 
          text: 'Describe a time you worked well in a team.', 
          type: 'behavioral',
          targetWords: 120,
          guidance: 'STAR format: Situation → Task → Action → Result'
        },
        { 
          id: 3, 
          text: 'Tell me about a challenge you overcame.', 
          type: 'behavioral',
          targetWords: 120,
          guidance: 'Focus on your problem-solving process and what you learned'
        },
        { 
          id: 4, 
          text: 'Why do you want to work here?', 
          type: 'behavioral',
          targetWords: 80,
          guidance: 'Connect company values/mission to your career goals'
        },
        { 
          id: 5, 
          text: 'Where do you see yourself in 5 years?', 
          type: 'behavioral',
          targetWords: 80,
          guidance: 'Show ambition while staying realistic to this role'
        }
      ];

      const defaultTechnical: Question[] = [
        { 
          id: 1, 
          text: 'Explain the difference between SQL and NoSQL databases.', 
          type: 'technical',
          targetWords: 75,
          guidance: 'Define both, then contrast use cases'
        },
        { 
          id: 2, 
          text: 'How would you reverse a linked list?', 
          type: 'technical',
          targetWords: 100,
          guidance: 'Describe approach, mention time/space complexity'
        },
        { 
          id: 3, 
          text: 'What is the virtual DOM in React?', 
          type: 'technical',
          targetWords: 80,
          guidance: 'Explain concept and why it improves performance'
        },
        { 
          id: 4, 
          text: 'Explain RESTful API principles.', 
          type: 'technical',
          targetWords: 90,
          guidance: 'Cover HTTP methods, statelessness, resource-based URLs'
        },
        { 
          id: 5, 
          text: 'What is the time complexity of binary search?', 
          type: 'technical',
          targetWords: 60,
          guidance: 'State complexity and explain why'
        }
      ];

      const defaultQuestions = interviewType === 'behavioral' ? defaultBehavioral : defaultTechnical;
      setQuestions(defaultQuestions);
      setResponses(new Array(defaultQuestions.length).fill(''));
      setSessionStartTime(Date.now());
      setStep('interview');
    }
  };

  const saveSession = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);

    // Filter out empty responses before sending
    const validResponses = responses.map(r => r || '').filter(r => r.trim());
    const validQuestions = questions.filter((_, idx) => responses[idx] && responses[idx].trim());

    console.log('Saving session with:', {
      jobId: selectedJobId,
      jobTitle: role,
      company: company,
      interviewType: interviewType,
      questionsCount: validQuestions.length,
      responsesCount: validResponses.length,
      allResponses: responses
    });

    if (validQuestions.length === 0) {
      alert('No responses to save. Please answer at least one question.');
      setIsSaving(false);
      return false;
    }

    try {
      const response = await fetch('/api/practice-sessions/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: selectedJobId,
          jobTitle: role,
          company: company,
          interviewType: interviewType,
          questions: validQuestions,
          responses: validResponses,
          duration: duration
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `Failed to save session (${response.status})`);
      }

      const data = await response.json();
      console.log('Session saved successfully:', data);
      setSessionResults(data.questions);
      setAverageScore(data.averageScore);
      setIsSaving(false);
      return true;
    } catch (err) {
      console.error('Error saving session:', err);
      setIsSaving(false);
      alert(`Failed to save session: ${err.message}`);
      return false;
    }
  };

  const totalQuestions = questions.length;
  const progressPercent = totalQuestions ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleNext = async () => {
    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = response;
    setResponses(newResponses);

    if (currentQuestionIndex < totalQuestions - 1) {
      setResponse(newResponses[currentQuestionIndex + 1] || '');
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCompleted(true);
      const saved = await saveSession();
      if (saved) {
        setStep('summary');
      }
    }
  };

  const handleBackToJobs = () => {
    setStep('job-select');
    setResponse('');
    setCurrentQuestionIndex(0);
    setCompleted(false);
    setResponses([]);
    setSessionResults([]);
  };

  const handleBackToTypeSelect = () => {
    setStep('type-select');
    setSelectedJobId('');
    setResponse('');
    setCurrentQuestionIndex(0);
    setCompleted(false);
    setResponses([]);
    setSessionResults([]);
  };

  // Calculate response metrics
  const getResponseMetrics = () => {
    const words = response.trim().split(/\s+/).filter(w => w.length > 0).length;
    const targetWords = questions[currentQuestionIndex]?.targetWords || 100;
    const estimatedSeconds = Math.ceil(words / 2.5); // ~150 words/min speaking pace
    
    let status: 'short' | 'good' | 'long' = 'good';
    if (words < targetWords * 0.5) status = 'short';
    else if (words > targetWords * 1.8) status = 'long';
    
    return { words, targetWords, estimatedSeconds, status };
  };

  if (step === 'type-select') {
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="setup-content">
          <h1 className="setup-title">Mock Interview Practice</h1>
          <p className="setup-subtitle">What kind of interview would you like to practice?</p>
          <div className="type-selection">
            <button
              className={`type-option ${interviewType === 'behavioral' ? 'selected' : ''}`}
              onClick={() => setInterviewType('behavioral')}
            >
              <div className="type-icon">💬</div>
              <div className="type-label">Behavioral</div>
              <div className="type-desc">STAR method, teamwork, leadership</div>
            </button>
            <button
              className={`type-option ${interviewType === 'technical' ? 'selected' : ''}`}
              onClick={() => setInterviewType('technical')}
            >
              <div className="type-icon">⚙️</div>
              <div className="type-label">Technical</div>
              <div className="type-desc">Concepts, algorithms, problem-solving</div>
            </button>
          </div>
          <button className="start-button" onClick={() => setStep('job-select')}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'job-select') {
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={handleBackToTypeSelect}>
          ← Back to Type
        </button>
        <div className="setup-content">
          <h1 className="setup-title">
            {interviewType === 'behavioral' ? 'Behavioral' : 'Technical'} Mock Interview
          </h1>
          <p className="setup-subtitle">Select a job to get tailored questions (5 questions, ~10-15 min)</p>
          {savedJobs.length === 0 ? (
            <p>No saved jobs found.</p>
          ) : (
            <div className="setup-form">
              <div className="form-group">
                <label>Your Jobs</label>
                <select
                  className="form-input"
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                >
                  <option value="">— Choose a job —</option>
                  {savedJobs.map(job => (
                    <option key={job._id} value={job._id}>
                      {job.jobTitle} @ {job.company}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="start-button"
                onClick={handleStartWithJob}
                disabled={!selectedJobId}
              >
                Start Practice →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'interview') {
    const q = questions[currentQuestionIndex];
    const metrics = getResponseMetrics();
    
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={handleBackToJobs}>
          ← Change Job
        </button>
        <div className="interview-header">
          <div className="interview-info">
            <span className="interview-role">{role}</span>
            {company && <span> • {company}</span>}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="progress-text">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
        </div>
        
        <div className="question-card">
          <div className="question-header">
            <span className="question-type">
              {q.type === 'behavioral' ? '💬 Behavioral' : '⚙️ Technical'}
            </span>
            <span className="question-time">⏱️ ~{Math.ceil((q.targetWords || 100) / 2.5 / 60)} min</span>
          </div>
          <p className="question-text">{q.text}</p>
          {q.guidance && (
            <div className="guidance-box">
              <strong>💡 Tip:</strong> {q.guidance}
            </div>
          )}
          <div className="target-length">
            Target: ~{q.targetWords} words ({Math.ceil((q.targetWords || 100) / 2.5)} seconds when spoken)
          </div>
        </div>
        
        <div className="response-section">
          <label className="response-label">Your Response</label>
          <textarea
            ref={textareaRef}
            className="response-textarea"
            placeholder="Type your answer..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={1}
          />
          <div className="response-meta">
            <div className="metrics">
              <span className={`word-count ${metrics.status}`}>
                {metrics.words} / {metrics.targetWords} words
              </span>
              <span className="time-estimate">≈ {metrics.estimatedSeconds}s spoken</span>
              {metrics.status === 'short' && (
                <span className="status-hint short">Add more detail</span>
              )}
              {metrics.status === 'long' && (
                <span className="status-hint long">Try to be more concise</span>
              )}
              {metrics.status === 'good' && (
                <span className="status-hint good">Good length ✓</span>
              )}
            </div>
            <button
              className="next-button"
              onClick={handleNext}
              disabled={!response.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : (currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next →')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (step === 'technical-prep') { return ( <TechnicalPrep onBack={() => setStep('job-select')} jobTitle={role} company={company} jobId={selectedJobId} /> ); }
  if (step === 'summary') {
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="summary-content">
          <div className="summary-header">
            <div className="score-circle">
              <span className="score-number">{Math.round(averageScore)}</span>
              <span className="score-label">Overall Score</span>
            </div>
            <h1 className="summary-title">Interview Complete!</h1>
            <p className="summary-subtitle">
              You completed {totalQuestions} {interviewType} questions for {role}.
            </p>
          </div>

          <div className="results-breakdown">
            <h2>Your Responses</h2>
            {sessionResults.map((result, idx) => (
              <div key={idx} className="result-item">
                <div className="result-header">
                  <span className="result-question">Q{idx + 1}: {result.question}</span>
                  <span className={`result-score ${result.score >= 70 ? 'good' : result.score >= 50 ? 'okay' : 'poor'}`}>
                    {result.score}/100
                  </span>
                </div>
                {result.aiFeedback && (
                  <p className="result-feedback">💡 {result.aiFeedback}</p>
                )}
              </div>
            ))}
          </div>

          <div className="summary-actions">
            <button className="action-button secondary" onClick={handleBackToJobs}>
              Practice Another Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MockPractice;