import React, { useState, useRef, useEffect } from "react";
import '../../styles/InterviewStyles/TechnicalPrep.css';
import API_BASE from "../../utils/apiBase";

interface Challenge {
  id: number;
  title: string;
  type: string;
  difficulty: string;
  prompt: string;
  targetLines?: number;
  targetWords?: number;
  guidance?: string;
}

interface Question {
  id: number;
  text: string;
  targetWords?: number;
  guidance?: string;
}

interface ChallengeResult {
  question: string;
  solution: string;
  score?: number;
  feedback?: string;
}

export default function TechnicalPrep({ 
  onBack, 
  jobTitle, 
  company, 
  jobId,
  jobDescription  // ✅ ADD THIS
}: { 
  onBack: () => void; 
  jobTitle: string; 
  company: string;
  jobId: string;
  jobDescription: string;  // ✅ ADD THIS
}) {
  const [step, setStep] = useState<'type-select' | 'select-coding' | 'coding' | 'situational' | 'summary'>('type-select');
  const [techType, setTechType] = useState<'situational' | 'coding'>('situational');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [averageScore, setAverageScore] = useState(0);
  const [situationalQuestions, setSituationalQuestions] = useState<Question[]>([]);
  const [codingChallenges, setCodingChallenges] = useState<Challenge[]>([]);  // ✅ NOW STATE
  const [loadingChallenges, setLoadingChallenges] = useState(false);  // ✅ ADD THIS
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ✅ REMOVE THE HARDCODED codingChallenges ARRAY - it's now state

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [response]);

  const generateSituationalQuestions = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE}/api/interview-insights/generate-questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          jobTitle, 
          company, 
          type: 'technical' 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate questions (${response.status})`);
      }

      const data = await response.json();
      console.log('Generated questions:', data);
      const generatedQuestions = data.questions.slice(0, 5);
      
      const newQuestions: Question[] = generatedQuestions.map((text: string, i: number) => ({
        id: i + 1,
        text,
        targetWords: 120,
        guidance: 'Explain your thought process and consider trade-offs'
      }));

      setSituationalQuestions(newQuestions);
      setResponses(new Array(newQuestions.length).fill(''));
      setStep('situational');
    } catch (err) {
      console.error('Failed to generate questions, using defaults:', err);
      alert('Could not generate custom questions. Using default questions instead.');
      
      const defaultQuestions: Question[] = [
        { 
          id: 1, 
          text: 'Explain the difference between SQL and NoSQL databases. When would you use each?',
          targetWords: 120,
          guidance: 'Discuss structure, scalability, and specific use cases'
        },
        { 
          id: 2, 
          text: 'How would you design a URL shortening service like bit.ly?',
          targetWords: 150,
          guidance: 'Cover hashing, database design, and scalability'
        },
        { 
          id: 3, 
          text: 'What is the difference between a process and a thread?',
          targetWords: 100,
          guidance: 'Explain memory allocation and context switching'
        },
        { 
          id: 4, 
          text: 'Explain how RESTful APIs work and their key principles.',
          targetWords: 110,
          guidance: 'Cover HTTP methods, statelessness, and resource naming'
        },
        { 
          id: 5, 
          text: 'What is the time complexity of common sorting algorithms?',
          targetWords: 100,
          guidance: 'Compare quicksort, mergesort, and heapsort'
        }
      ];

      setSituationalQuestions(defaultQuestions);
      setResponses(new Array(defaultQuestions.length).fill(''));
      setStep('situational');
    }
  };

  // ✅ ADD THIS NEW FUNCTION
  const generateCodingChallenges = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE}/api/practice-sessions/generate-coding-challenges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          jobTitle, 
          company,
          jobDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate coding challenges');
      }

      const data = await response.json();
      console.log('Generated coding challenges:', data);
      
      const generatedChallenges: Challenge[] = data.challenges.map((c: any, i: number) => ({
        id: i + 1,
        title: c.title,
        type: c.type,
        difficulty: c.difficulty,
        prompt: c.prompt,
        targetLines: c.targetLines || 10,
        guidance: c.guidance
      }));

      setCodingChallenges(generatedChallenges);
      setResponses(new Array(generatedChallenges.length).fill(''));
      setStep('select-coding');
      
    } catch (err) {
      console.error('Failed to generate coding challenges:', err);
      alert('Could not generate custom coding challenges. Using default challenges.');
      
      // Fall back to default challenges
      const defaultChallenges: Challenge[] = [
        {
          id: 1,
          title: "Two Sum",
          type: "Array",
          difficulty: "Easy",
          prompt: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
          targetLines: 10,
          guidance: "Consider using a hash map for O(n) time complexity"
        },
        {
          id: 2,
          title: "Valid Parentheses",
          type: "Stack",
          difficulty: "Easy",
          prompt: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
          targetLines: 12,
          guidance: "Use a stack to track opening brackets"
        },
        {
          id: 3,
          title: "Reverse Linked List",
          type: "Linked List",
          difficulty: "Easy",
          prompt: "Given the head of a singly linked list, reverse the list and return the reversed list.",
          targetLines: 10,
          guidance: "Track previous, current, and next pointers"
        }
      ];
      
      setCodingChallenges(defaultChallenges);
      setResponses(new Array(defaultChallenges.length).fill(''));
      setStep('select-coding');
    }
  };

  // ✅ UPDATE THIS FUNCTION
  const handleTypeSelect = async (type: 'situational' | 'coding') => {
    setTechType(type);
    
    if (type === 'situational') {
      setLoading(true);
      await generateSituationalQuestions();
      setLoading(false);
    } else {
      setLoadingChallenges(true);
      await generateCodingChallenges();
      setLoadingChallenges(false);
    }
  };

  const handleStartCoding = () => {
    setResponses(new Array(codingChallenges.length).fill(''));
    setResults([]);
    setStep('coding');
  };

  const handleNext = () => {
    const newResponses = [...responses];
    newResponses[currentIndex] = response;
    setResponses(newResponses);

    const totalQuestions = techType === 'situational' 
      ? situationalQuestions.length 
      : codingChallenges.length;

    if (currentIndex < totalQuestions - 1) {
      setResponse(newResponses[currentIndex + 1] || '');
      setCurrentIndex(prev => prev + 1);
    } else {
      scoreAllResponses(newResponses);
    }
  };

  const scoreAllResponses = async (allResponses: string[]) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const endpoint = `${API_BASE}/api/practice-sessions/save`;

      const questions = techType === 'situational' ? situationalQuestions : codingChallenges;
      const validResponses = allResponses.filter(r => r.trim());
      const validQuestions = questions.filter((_, idx) => allResponses[idx]?.trim());

      if (validQuestions.length === 0) {
        alert('No responses to score.');
        setLoading(false);
        return;
      }

      const formattedQuestions = validQuestions.map((q) => ({
        text: techType === 'situational' ? q.text : q.title,
        type: techType === 'situational' ? 'technical' : 'coding',
        targetWords: techType === 'situational' ? (q.targetWords || 100) : 100
      }));

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: jobId,
          jobTitle,
          company,
          interviewType: techType === 'situational' ? 'technical' : 'coding',
          questions: formattedQuestions,
          responses: validResponses,
          duration: 120,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to score responses');
      }

      const data = await res.json();

      const scoredResults: ChallengeResult[] = data.questions.map((q: any, idx: number) => ({
        question: q.question || formattedQuestions[idx].text,
        solution: validResponses[idx],
        score: q.score || 0,
        feedback: q.aiFeedback || "No feedback"
      }));

      setResults(scoredResults);
      setAverageScore(data.averageScore || 0);
      setStep('summary');

    } catch (err) {
      console.error("Scoring error:", err);
      alert(`Failed to score responses: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getResponseMetrics = () => {
    const words = response.trim().split(/\s+/).filter(w => w.length > 0).length;
    const targetWords = techType === 'situational' ? 120 : 0;
    const estimatedSeconds = Math.ceil(words / 2.5);
    
    let status: 'short' | 'good' | 'long' = 'good';
    if (techType === 'situational') {
      if (words < targetWords * 0.5) status = 'short';
      else if (words > targetWords * 1.8) status = 'long';
    }
    
    return { words, targetWords, estimatedSeconds, status };
  };

  const getLineCount = () => {
    return response.split('\n').filter(line => line.trim()).length;
  };

  const totalItems = techType === 'situational' 
    ? situationalQuestions.length 
    : codingChallenges.length;
  const progressPercent = ((currentIndex + 1) / totalItems) * 100;

  // TYPE SELECT VIEW
  if (step === 'type-select') {
    return (
      <div className="tech-prep-container">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1 className="prep-title">Technical Interview</h1>
        <p className="prep-subtitle">
          {jobTitle} @ {company}
        </p>
        <h2>Choose Your Practice Type</h2>
        <div className="type-selection">
          <button
            className="type-option"
            onClick={() => handleTypeSelect('situational')}
            disabled={loading}
          >
            <div className="type-icon">💭</div>
            <div className="type-label">Technical Situational</div>
            <div className="type-desc">System design, databases, APIs, algorithms</div>
          </button>
          <button
            className="type-option"
            onClick={() => handleTypeSelect('coding')}
            disabled={loadingChallenges}
          >
            <div className="type-icon">💻</div>
            <div className="type-label">Coding Challenges</div>
            <div className="type-desc">Write code, solve algorithms, get AI feedback</div>
          </button>
        </div>
        {loading && <p className="loading-text">Generating questions...</p>}
        {loadingChallenges && <p className="loading-text">Generating coding challenges...</p>}
      </div>
    );
  }

  // ✅ UPDATE CODING CHALLENGES SELECT VIEW
  if (step === 'select-coding') {
    return (
      <div className="tech-prep-container">
        <button className="back-button" onClick={() => setStep('type-select')}>
          ← Back to Type Selection
        </button>
        <h1 className="prep-title">Coding Challenges</h1>
        <p className="prep-subtitle">
          {jobTitle} @ {company}
        </p>
        <h2>Practice Problems</h2>
        
        {loadingChallenges ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Generating custom coding challenges...</p>
          </div>
        ) : (
          <>
            <div className="challenge-list">
              {codingChallenges.map(c => (
                <div key={c.id} className="challenge-card-preview">
                  <div className="challenge-header">
                    <span>{c.title}</span>
                    <span className="diff">{c.difficulty}</span>
                  </div>
                  <div className="challenge-type">{c.type}</div>
                  <p className="challenge-preview">{c.prompt.substring(0, 80)}...</p>
                </div>
              ))}
            </div>
            <button className="start-button" onClick={handleStartCoding}>
              Start Coding Challenges →
            </button>
          </>
        )}
      </div>
    );
  }

  // REST OF THE VIEWS REMAIN THE SAME...
  // (situational, coding, summary views stay exactly as they were)

  // SITUATIONAL QUESTIONS VIEW
  if (step === 'situational') {
    const question = situationalQuestions[currentIndex];
    const metrics = getResponseMetrics();

    return (
      <div className="tech-prep-container">
        <button className="back-button" onClick={() => setStep('type-select')}>
          ← Back to Type Selection
        </button>
        
        <div className="coding-header">
          <div className="coding-info">
            <span className="coding-role">{jobTitle}</span>
            {company && <span> • {company}</span>}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="progress-text">
            Question {currentIndex + 1} of {totalItems}
          </div>
        </div>

        <div className="challenge-card-active">
          <div className="challenge-header-row">
            <div>
              <h2 className="challenge-title">Technical Question</h2>
              <span className="challenge-meta">⏱️ ~{Math.ceil((question.targetWords || 100) / 2.5 / 60)} min</span>
            </div>
            <span className="challenge-badge">Situational</span>
          </div>
          
          <div className="challenge-prompt">
            <h3>Question</h3>
            <p>{question.text}</p>
          </div>

          {question.guidance && (
            <div className="guidance-box">
              <strong>💡 Tip:</strong> {question.guidance}
            </div>
          )}

          <div className="target-info">
            Target: ~{question.targetWords} words ({Math.ceil((question.targetWords || 100) / 2.5)} seconds when spoken)
          </div>
        </div>

        <div className="solution-section">
          <label className="solution-label">Your Response</label>
          <textarea
            ref={textareaRef}
            className="response-textarea"
            placeholder="Explain your answer..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={1}
          />
          
          <div className="solution-meta">
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
              className="submit-button"
              onClick={handleNext}
              disabled={!response.trim() || loading}
            >
              {loading ? 'Scoring...' : (currentIndex === totalItems - 1 ? 'Finish' : 'Next →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CODING CHALLENGES VIEW
  if (step === 'coding') {
    const challenge = codingChallenges[currentIndex];
    const lineCount = getLineCount();

    return (
      <div className="tech-prep-container">
        <button className="back-button" onClick={() => setStep('select-coding')}>
          ← Back to Overview
        </button>
        
        <div className="coding-header">
          <div className="coding-info">
            <span className="coding-role">{jobTitle}</span>
            {company && <span> • {company}</span>}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="progress-text">
            Challenge {currentIndex + 1} of {totalItems}
          </div>
        </div>

        <div className="challenge-card-active">
          <div className="challenge-header-row">
            <div>
              <h2 className="challenge-title">{challenge.title}</h2>
              <span className="challenge-meta">{challenge.type} • {challenge.difficulty}</span>
            </div>
            <span className="challenge-badge">{challenge.difficulty}</span>
          </div>
          
          <div className="challenge-prompt">
            <h3>Problem</h3>
            <p>{challenge.prompt}</p>
          </div>

          {challenge.guidance && (
            <div className="guidance-box">
              <strong>💡 Hint:</strong> {challenge.guidance}
            </div>
          )}

          <div className="target-info">
            Target: ~{challenge.targetLines} lines of clean code
          </div>
        </div>

        <div className="solution-section">
          <label className="solution-label">Your Solution</label>
          <textarea
            ref={textareaRef}
            className="code-editor"
            placeholder="// Write your solution here...
function twoSum(nums, target) {
  
}"
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={15}
          />
          
          <div className="solution-meta">
            <div className="metrics">
              <span className="line-count">
                {lineCount} lines
              </span>
              {challenge.targetLines && (
                <span className={`line-status ${
                  lineCount < challenge.targetLines * 0.5 ? 'short' : 
                  lineCount > challenge.targetLines * 2 ? 'long' : 'good'
                }`}>
                  {lineCount < challenge.targetLines * 0.5 && '⚠️ Might need more detail'}
                  {lineCount > challenge.targetLines * 2 && '⚠️ Consider simplifying'}
                  {lineCount >= challenge.targetLines * 0.5 && lineCount <= challenge.targetLines * 2 && '✓ Good length'}
                </span>
              )}
            </div>
            <button
              className="submit-button"
              onClick={handleNext}
              disabled={!response.trim() || loading}
            >
              {loading ? 'Scoring...' : (currentIndex === totalItems - 1 ? 'Finish & Score' : 'Submit & Next →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUMMARY VIEW
  if (step === 'summary') {
    return (
      <div className="tech-prep-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        
        <div className="summary-content">
          <div className="summary-header">
            <div className="score-circle">
              <span className="score-number">{averageScore}</span>
              <span className="score-label">Average Score</span>
            </div>
            <h1 className="summary-title">
              {techType === 'situational' ? 'Technical Situational' : 'Coding'} Complete!
            </h1>
            <p className="summary-subtitle">
              You completed {totalItems} {techType === 'situational' ? 'technical questions' : 'coding challenges'} for {jobTitle}.
            </p>
          </div>

          <div className="results-breakdown">
            <h2>Your {techType === 'situational' ? 'Responses' : 'Solutions'}</h2>
            {results.map((result, idx) => (
              <div key={idx} className="result-item">
                <div className="result-header">
                  <span className="result-question">
                    {idx + 1}. {result.question}
                  </span>
                  <span className={`result-score ${
                    result.score && result.score >= 70 ? 'good' : 
                    result.score && result.score >= 50 ? 'okay' : 'poor'
                  }`}>
                    {result.score}/100
                  </span>
                </div>
                {result.feedback && (
                  <div className="result-feedback">
                    <strong>Feedback:</strong> {result.feedback}
                  </div>
                )}
                <details className="solution-details">
                  <summary>View your {techType === 'situational' ? 'response' : 'solution'}</summary>
                  <pre className="solution-code">{result.solution}</pre>
                </details>
              </div>
            ))}
          </div>

          <div className="summary-actions">
            <button className="action-button primary" onClick={() => {
              setStep('type-select');
              setCurrentIndex(0);
              setResponse('');
              setResponses([]);
              setResults([]);
            }}>
              Practice Again
            </button>
            <button className="action-button secondary" onClick={onBack}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}