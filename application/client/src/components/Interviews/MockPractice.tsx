// MockPractice.tsx
import React, { useState, useRef, useEffect } from 'react';
import '../../styles/InterviewStyles/MockPractice.css';

type InterviewStep = 'job-select' | 'interview' | 'summary';

interface Question {
  id: number;
  text: string;
  type: 'behavioral'; // only behavioral
  followUp?: string;
  guidance?: string;
}

interface SavedJob {
  _id: string;
  jobTitle: string;
  company: string;
}

const MockPractice: React.FC = () => {
  const [step, setStep] = useState<InterviewStep>('job-select');
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [response, setResponse] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [response]);

  // Fetch user's saved jobs
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

  const generateQuestionsWithGemini = async (jobTitle: string, company: string): Promise<string[]> => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/interview-insights/generate-questions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobTitle, company })
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

    try {
      // Generate questions using Gemini
      const generatedQuestions = await generateQuestionsWithGemini(job.jobTitle, job.company);
      
      const newQuestions: Question[] = generatedQuestions.map((text, i) => ({
        id: i + 1,
        text,
        type: 'behavioral',
        guidance: ''
      }));

      setQuestions(newQuestions);
      setStep('interview');
    } catch (err) {
      console.error('Failed to generate questions, using defaults:', err);
      // Fallback to default questions
      setQuestions([
        { id: 1, text: 'Tell me about yourself.', type: 'behavioral' },
        { id: 2, text: 'What is your greatest professional strength?', type: 'behavioral' },
        { id: 3, text: 'Describe a time you worked well in a team.', type: 'behavioral' },
        { id: 4, text: 'Why do you want to work here?', type: 'behavioral' },
        { id: 5, text: 'Where do you see yourself in 5 years?', type: 'behavioral' },
        { id: 6, text: 'Tell me about a time you faced a significant challenge.', type: 'behavioral' },
        { id: 7, text: 'How do you handle constructive criticism?', type: 'behavioral' },
        { id: 8, text: 'Describe a situation where you had to work with a difficult team member.', type: 'behavioral' },
        { id: 9, text: 'What accomplishment are you most proud of?', type: 'behavioral' },
        { id: 10, text: 'How do you handle stress and pressure?', type: 'behavioral' }
      ]);
      setStep('interview');
    }
  };

  const totalQuestions = questions.length;
  const progressPercent = totalQuestions ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setResponse('');
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCompleted(true);
      setStep('summary');
    }
  };

  const handleBackToJobs = () => {
    setStep('job-select');
    setResponse('');
    setCurrentQuestionIndex(0);
    setCompleted(false);
  };

  // === JOB SELECTION STEP ===
  if (step === 'job-select') {
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={() => window.location.href = '/interviews'}>
          ← Back to Dashboard
        </button>
        <div className="setup-content">
          <h1 className="setup-title">Behavioral Mock Interview</h1>
          <p className="setup-subtitle">Select a job to practice behavioral questions</p>
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
                Start Behavioral Practice
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === INTERVIEW STEP ===
  if (step === 'interview') {
    const q = questions[currentQuestionIndex];
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
            <span className="question-type">Behavioral</span>
            <span className="question-time">⏱️ 2 min</span>
          </div>
          <p className="question-text">{q.text}</p>
          {q.guidance && <div className="guidance-box">{q.guidance}</div>}
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
            <span className="char-count">{response.length} characters</span>
            <button
              className="next-button"
              onClick={handleNext}
              disabled={!response.trim()}
            >
              {currentQuestionIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === SUMMARY STEP ===
  if (step === 'summary') {
    const score = Math.min(95, 75 + response.length / 10);
    return (
      <div className="mock-interview-container">
        <button className="back-button" onClick={() => window.location.href = '/interviews'}>
          ← Back to Dashboard
        </button>
        <div className="summary-content">
          <div className="summary-header">
            <div className="score-circle">
              <span className="score-number">{Math.round(score)}</span>
              <span className="score-label">Behavioral Score</span>
            </div>
            <h1 className="summary-title">Great Job!</h1>
            <p className="summary-subtitle">
              You've practiced behavioral questions for {role}.
            </p>
          </div>
          <div className="summary-actions">
            <button className="action-button primary" onClick={() => alert('Saved!')}>
              Save Report
            </button>
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