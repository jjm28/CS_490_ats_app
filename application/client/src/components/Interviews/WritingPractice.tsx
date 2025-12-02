// src/components/Interviews/WritingPractice.tsx
// ENHANCED VERSION with:
// ✅ Session history viewing
// ✅ Question practice tracking
// ✅ Timer reset on navigation
// ✅ Back button during practice

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../utils/apiBase';
import VirtualInterviewTips from './VirtualInterviewTips';
import NerveManagementModal from './NerveManagementModal';
import WritingPracticeDashboard from './WritingPracticeDashboard';

type Job = {
  _id: string;
  jobTitle: string;
  company: string;
};

type Question = {
  id: string;
  text: string;
  category: 'behavioral' | 'technical' | 'situational';
};

type AnalysisResult = {
  overallScore: number;
  structureScore: number | null;
  clarityScore: number | null;
  storytellingScore: number | null;
  feedback: string;
  strengths: string[];
  improvements: string[];
  wordCount: number;
  hasSTARElements: boolean | null;
  analyzedAt: string;
};

type ResponseData = {
  question: string;
  response: string;
  category: string;
  timeSpentSeconds: number;
} & AnalysisResult;

type WritingPracticeProps = {
  onBack?: () => void;
};

const TIMER_OPTIONS = [
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: null, label: 'Untimed' }
];

export default function WritingPractice({ onBack }: WritingPracticeProps) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  
  // Tab state - NOW WITH HISTORY
  const [activeTab, setActiveTab] = useState<'practice' | 'progress' | 'history'>('practice');
  
  // Practice state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Timer state
  const [timerDuration, setTimerDuration] = useState<number | null>(300);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(300);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Response state
  const [response, setResponse] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sessionResponses, setSessionResponses] = useState<ResponseData[]>([]);
  
  // UI state
  const [showNerveModal, setShowNerveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  
  // NEW: Session history state
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // NEW: Track which questions have been practiced
  const [practicedQuestions, setPracticedQuestions] = useState<Set<string>>(new Set());

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch questions when job is selected
  useEffect(() => {
    if (selectedJobId) {
      fetchQuestions();
      fetchSessions();
      loadPracticedQuestions();
      const job = jobs.find(j => j._id === selectedJobId);
      setSelectedJob(job || null);
    } else {
      setQuestions([]);
      setCurrentQuestion(null);
      setSelectedJob(null);
    }
  }, [selectedJobId, jobs]);
  
  // NEW: Load practiced questions from localStorage and sessions
  const loadPracticedQuestions = async () => {
    if (!selectedJobId) return;
    
    const practiced = new Set<string>();
    
    // Check localStorage for practiced questions
    questions.forEach(q => {
      const storageKey = `writing_practice_${selectedJobId}_${q.id}`;
      if (localStorage.getItem(storageKey)) {
        practiced.add(q.id);
      }
    });
    
    setPracticedQuestions(practiced);
  };
  
  // NEW: Fetch user's sessions for this job
  const fetchSessions = async () => {
    if (!selectedJobId) return;
    
    setLoadingSessions(true);
    try {
      const res = await fetch(`${API_BASE}/api/writing-practice/sessions?jobId=${selectedJobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch sessions');
      
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
      
      // Mark questions as practiced if they appear in any session
      const practiced = new Set<string>(practicedQuestions);
      data.forEach((session: any) => {
        session.responses?.forEach((r: any) => {
          const matchingQuestion = questions.find(q => q.text === r.question);
          if (matchingQuestion) {
            practiced.add(matchingQuestion.id);
          }
        });
      });
      setPracticedQuestions(practiced);
      
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Update word count as user types
  useEffect(() => {
    const words = response.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [response]);

  // Timer logic
  useEffect(() => {
    if (isTimerActive && timeRemaining !== null && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, timeRemaining]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to load jobs');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/interview-questions/${selectedJobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch questions');
      
      const data = await res.json();
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (question: Question) => {
    setCurrentQuestion(question);
    setResponse('');
    setAnalysisResult(null);
    // setSessionStartTime(Date.now());
    
    // if (timerDuration !== null) {
    //   setTimeRemaining(timerDuration);
    //   setIsTimerActive(true);
    // }
    
    setShowNerveModal(true);
  };
  
  // NEW: Go back to questions with confirmation
  const goBackToQuestions = () => {
    if (response.trim() && !analysisResult) {
      if (!confirm('You have an unsaved response. Are you sure you want to go back?')) {
        return;
      }
    }
    
    stopTimer();
    setCurrentQuestion(null);
    setResponse('');
    setAnalysisResult(null);
    setSessionStartTime(null);
    setTimeRemaining(timerDuration);
  };

  const stopTimer = () => {
    setIsTimerActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const submitForAnalysis = async () => {
    if (!response.trim() || !currentQuestion || !selectedJob) {
      setError('Please write a response before submitting');
      return;
    }

    stopTimer();
    setIsAnalyzing(true);
    setError(null);

    const timeSpent = sessionStartTime 
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;

    try {
      const res = await fetch(`${API_BASE}/api/interview-insights/analyze-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question: currentQuestion.text,
          response,
          category: currentQuestion.category,
          jobTitle: selectedJob.jobTitle,
          company: selectedJob.company
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysis: AnalysisResult = await res.json();
      setAnalysisResult(analysis);

      const responseData: ResponseData = {
        question: currentQuestion.text,
        response,
        category: currentQuestion.category,
        timeSpentSeconds: timeSpent,
        ...analysis
      };
      setSessionResponses(prev => [...prev, responseData]);
      
      // NEW: Mark question as practiced in localStorage
      const storageKey = `writing_practice_${selectedJobId}_${currentQuestion.id}`;
      localStorage.setItem(storageKey, JSON.stringify({
        response,
        analyzedAt: analysis.analyzedAt,
        score: analysis.overallScore
      }));
      
      // NEW: Update practiced questions set
      setPracticedQuestions(prev => new Set(prev).add(currentQuestion.id));

      setFlash('Analysis complete! 🎉');
      setTimeout(() => setFlash(null), 3000);

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze response');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveSession = async () => {
    if (sessionResponses.length === 0) {
      setError('No responses to save');
      return;
    }

    try {
      const totalDuration = sessionResponses.reduce((sum, r) => sum + r.timeSpentSeconds, 0);

      const res = await fetch(`${API_BASE}/api/writing-practice/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: selectedJobId,
          jobTitle: selectedJob?.jobTitle,
          company: selectedJob?.company,
          sessionType: timerDuration === null ? 'untimed' : 'timed',
          timerDuration,
          totalDuration,
          responses: sessionResponses
        })
      });

      if (!res.ok) throw new Error('Failed to save session');

      const data = await res.json();
      setFlash(`Session saved! Average score: ${data.averageOverallScore}/100`);
      setTimeout(() => setFlash(null), 5000);

      setSessionResponses([]);
      setCurrentQuestion(null);
      setResponse('');
      setAnalysisResult(null);
      
      // NEW: Refresh sessions list
      await fetchSessions();

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save session');
    }
  };

  const nextQuestion = () => {
    stopTimer();
    setCurrentQuestion(null);
    setResponse('');
    setAnalysisResult(null);
    setSessionStartTime(null);
    setTimeRemaining(timerDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack || (() => navigate('/Interviews'))}
          className="mb-4 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          ← Back to Interview Suite
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Response Writing Practice
          </h1>
          <p className="text-gray-600">
            Improve your written communication with AI-powered feedback
          </p>
        </div>

        {flash && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {flash}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <VirtualInterviewTips 
          jobId={selectedJobId}
          jobTitle={selectedJob?.jobTitle}
          company={selectedJob?.company}
        />

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('practice')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'practice'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✍️ Practice Mode
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'progress'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Progress Tracking
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📜 Session History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'practice' && (
              <PracticeModeContent
                jobs={jobs}
                selectedJobId={selectedJobId}
                setSelectedJobId={setSelectedJobId}
                questions={questions}
                currentQuestion={currentQuestion}
                startPractice={startPractice}
                goBackToQuestions={goBackToQuestions}
                loading={loading}
                timerDuration={timerDuration}
                setTimerDuration={setTimerDuration}
                timeRemaining={timeRemaining}
                isTimerActive={isTimerActive}
                response={response}
                setResponse={setResponse}
                wordCount={wordCount}
                submitForAnalysis={submitForAnalysis}
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                nextQuestion={nextQuestion}
                sessionResponses={sessionResponses}
                saveSession={saveSession}
                getScoreColor={getScoreColor}
                formatTime={formatTime}
                practicedQuestions={practicedQuestions}
              />
            )}

            {activeTab === 'progress' && (
              <WritingPracticeDashboard 
                selectedJobId={selectedJobId}
              />
            )}
            
            {activeTab === 'history' && (
              <SessionHistory
                sessions={sessions}
                loading={loadingSessions}
                selectedSession={selectedSession}
                setSelectedSession={setSelectedSession}
                getScoreColor={getScoreColor}
              />
            )}
          </div>
        </div>
      </div>

      <NerveManagementModal
        isOpen={showNerveModal}
        onClose={() => {
          setShowNerveModal(false);
          // Start practice when they click "I'm Ready"
          if (currentQuestion) {
            setResponse('');
            setAnalysisResult(null);
            setSessionStartTime(Date.now());
            if (timerDuration !== null) {
              setTimeRemaining(timerDuration);
              setIsTimerActive(true);
            }
          }
        }}
        onBack={() => {
          // Go back and clear the question
          setShowNerveModal(false);
          setCurrentQuestion(null);
        }}
        jobTitle={selectedJob?.jobTitle}
      />
    </div>
  );
}

// Practice Mode Content Component
function PracticeModeContent(props: any) {
  const {
    jobs,
    selectedJobId,
    setSelectedJobId,
    questions,
    currentQuestion,
    startPractice,
    goBackToQuestions,
    loading,
    timerDuration,
    setTimerDuration,
    practicedQuestions
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Position
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={currentQuestion !== null}
        >
          <option value="">-- Choose a position --</option>
          {jobs.map((job: any) => (
            <option key={job._id} value={job._id}>
              {job.jobTitle} — {job.company}
            </option>
          ))}
        </select>
      </div>

      {!currentQuestion && selectedJobId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timer Duration
          </label>
          <div className="flex gap-2 flex-wrap">
            {TIMER_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => setTimerDuration(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timerDuration === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!currentQuestion && selectedJobId && questions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Select a Question to Practice
          </h3>
          <div className="space-y-2">
            {questions.map((q: any) => (
              <button
                key={q.id}
                onClick={() => {
                  startPractice(q);
                }}
                className={`w-full text-left p-4 bg-white border-2 rounded-lg hover:border-blue-500 hover:shadow-md transition-all ${
                  practicedQuestions.has(q.id) 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        q.category === 'behavioral' ? 'bg-blue-100 text-blue-800' :
                        q.category === 'technical' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {q.category}
                      </span>
                      {practicedQuestions.has(q.id) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          ✅ Practiced
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900">{q.text}</p>
                  </div>
                  <span className="text-2xl">✍️</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-600">
          Loading questions...
        </div>
      )}

      {!selectedJobId && (
        <div className="text-center py-8 text-gray-500">
          Select a position to start practicing
        </div>
      )}

      {currentQuestion && (
        <PracticeInterface {...props} />
      )}
    </div>
  );
}

// Practice Interface Component
function PracticeInterface(props: any) {
  const {
    currentQuestion,
    goBackToQuestions,
    timeRemaining,
    response,
    setResponse,
    wordCount,
    submitForAnalysis,
    isAnalyzing,
    analysisResult,
    nextQuestion,
    sessionResponses,
    saveSession,
    getScoreColor,
    formatTime
  } = props;

  return (
    <div className="space-y-6">
      <button
        onClick={goBackToQuestions}
        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
      >
        ← Back to Questions
      </button>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
              currentQuestion.category === 'behavioral' ? 'bg-blue-100 text-blue-800' :
              currentQuestion.category === 'technical' ? 'bg-green-100 text-green-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {currentQuestion.category}
            </span>
            <p className="mt-2 text-lg font-medium text-gray-900">
              {currentQuestion.text}
            </p>
          </div>
          {timeRemaining !== null && (
            <div className={`text-2xl font-bold ${
              timeRemaining < 30 ? 'text-red-600 animate-pulse' :
              timeRemaining < 60 ? 'text-orange-600' :
              'text-gray-700'
            }`}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>

      {!analysisResult && (
        <>
          <div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your response here..."
              className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isAnalyzing}
            />
            <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
              <span>Word count: {wordCount}</span>
              {currentQuestion.category === 'behavioral' && (
                <span className="text-blue-600">
                  💡 Tip: Use the STAR method
                </span>
              )}
            </div>
          </div>

          <button
            onClick={submitForAnalysis}
            disabled={isAnalyzing || response.trim().length === 0}
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? '🔍 Analyzing...' : '✨ Submit for AI Analysis'}
          </button>
        </>
      )}

      {analysisResult && (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border-2 ${getScoreColor(analysisResult.overallScore)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Overall Score</h3>
              <div className="text-4xl font-bold">
                {analysisResult.overallScore}/100
              </div>
            </div>
            <p className="text-sm">{analysisResult.feedback}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysisResult.structureScore !== null && (
              <div className="p-4 bg-white border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Structure</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResult.structureScore}/100
                </div>
              </div>
            )}
            {analysisResult.clarityScore !== null && (
              <div className="p-4 bg-white border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Clarity</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResult.clarityScore}/100
                </div>
              </div>
            )}
            {analysisResult.storytellingScore !== null && (
              <div className="p-4 bg-white border rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Storytelling</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResult.storytellingScore}/100
                </div>
              </div>
            )}
          </div>

          {analysisResult.strengths.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Strengths</h4>
              <ul className="space-y-1">
                {analysisResult.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-green-800">• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.improvements.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">💡 Improvements</h4>
              <ul className="space-y-1">
                {analysisResult.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-sm text-yellow-800">• {improvement}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={nextQuestion}
              className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➡️ Next Question
            </button>
            {sessionResponses.length > 0 && (
              <button
                onClick={saveSession}
                className="flex-1 py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                💾 Save Session ({sessionResponses.length})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Session History Component
function SessionHistory({ sessions, loading, selectedSession, setSelectedSession, getScoreColor }: any) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading session history...</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📜</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Practice Sessions Yet
        </h3>
        <p className="text-gray-600">
          Complete your first practice session to see it here!
        </p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedSession(null)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
        >
          ← Back to All Sessions
        </button>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedSession.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(selectedSession.createdAt).toLocaleString()}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-2xl ${getScoreColor(selectedSession.averageOverallScore)}`}>
              {selectedSession.averageOverallScore}/100
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Overall</div>
              <div className="text-xl font-bold">{selectedSession.averageOverallScore}/100</div>
            </div>
            {selectedSession.averageStructureScore && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Structure</div>
                <div className="text-xl font-bold">{selectedSession.averageStructureScore}/100</div>
              </div>
            )}
            {selectedSession.averageClarityScore && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Clarity</div>
                <div className="text-xl font-bold">{selectedSession.averageClarityScore}/100</div>
              </div>
            )}
            {selectedSession.averageStorytellingScore && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Storytelling</div>
                <div className="text-xl font-bold">{selectedSession.averageStorytellingScore}/100</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Responses ({selectedSession.responses.length})</h4>
            {selectedSession.responses.map((r: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      r.category === 'behavioral' ? 'bg-blue-100 text-blue-800' :
                      r.category === 'technical' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {r.category}
                    </span>
                    <h5 className="font-medium text-gray-900 mt-2">{r.question}</h5>
                  </div>
                  <div className={`px-3 py-1 rounded font-bold ${getScoreColor(r.overallScore)}`}>
                    {r.overallScore}/100
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded mb-3">
                  <div className="text-sm text-gray-600 mb-1 font-medium">Your Response:</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.response}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {r.wordCount} words • {Math.floor(r.timeSpentSeconds / 60)}m {r.timeSpentSeconds % 60}s
                  </div>
                </div>

                {r.feedback && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">AI Feedback:</div>
                    <p className="text-sm text-gray-600">{r.feedback}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {r.strengths && r.strengths.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-sm font-semibold text-green-900 mb-2">✅ Strengths</div>
                      <ul className="text-xs text-green-800 space-y-1">
                        {r.strengths.map((s: string, i: number) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.improvements && r.improvements.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-sm font-semibold text-yellow-900 mb-2">💡 Improvements</div>
                      <ul className="text-xs text-yellow-800 space-y-1">
                        {r.improvements.map((imp: string, i: number) => (
                          <li key={i}>• {imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Your Practice Sessions ({sessions.length})
        </h3>
      </div>

      {sessions.map((session: any) => (
        <button
          key={session._id}
          onClick={() => setSelectedSession(session)}
          className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{session.title}</h4>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span>📅 {new Date(session.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>📝 {session.responses.length} responses</span>
                <span>•</span>
                <span>⏱️ {Math.floor(session.totalDuration / 60)}m {session.totalDuration % 60}s</span>
              </div>
              {session.improvementFromLastSession !== null && session.improvementFromLastSession !== 0 && (
                <div className={`mt-2 text-xs font-medium ${
                  session.improvementFromLastSession > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {session.improvementFromLastSession > 0 ? '📈' : '📉'} 
                  {session.improvementFromLastSession > 0 ? '+' : ''}
                  {session.improvementFromLastSession}% from last session
                </div>
              )}
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold ${getScoreColor(session.averageOverallScore)}`}>
              {session.averageOverallScore}/100
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}