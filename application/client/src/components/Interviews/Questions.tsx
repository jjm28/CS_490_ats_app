// src/pages/Questions.tsx
import { useEffect, useState } from "react";

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

// Map category to display name
const CATEGORY_LABELS: Record<Question['category'], string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  situational: 'Situational',
};

// STAR Guide (only for behavioral)
const STAR_GUIDE = `💡 Use the STAR method:
Situation • Task • Action • Result`;

// Question Card with Practice Support
function QuestionCard({
  question,
  index,
  jobId,
}: {
  question: Question;
  index: number;
  jobId: string;
}) {
  // Load saved response from localStorage
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
    <div
      className="p-5 rounded-xl border hover:shadow-md transition-all"
      style={{
        background: 'linear-gradient(to bottom right, #ffffff, #e8f3ef)',
        borderColor: practiced ? '#357266' : '#6DA598',
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex-shrink-0 w-8 h-8 text-white rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: '#357266' }}
        >
          Q{index + 1}
        </span>
        <div className="flex-1">
          <p className="font-medium leading-relaxed" style={{ color: '#0E3B43' }}>
            {question.text}
          </p>

          {/* Skills & Difficulty */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className="px-2 py-1 text-xs rounded-full"
              style={{
                background: '#e8f3ef',
                color: '#0E3B43',
                border: '1px solid #A3BBAD',
              }}
            >
              {question.difficulty}
            </span>
            {question.skills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  background: '#f0f7f5',
                  color: '#0E3B43',
                }}
              >
                {skill}
              </span>
            ))}
            {question.companySpecific && (
              <span
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  background: '#fff8e1',
                  color: '#5D4037',
                }}
              >
                Company-Specific
              </span>
            )}
          </div>

          {/* STAR Tip (behavioral only) */}
          {question.category === 'behavioral' && !isEditing && !practiced && (
            <p className="text-sm mt-3 text-blue-700 bg-blue-50 p-2 rounded">
              {STAR_GUIDE}
            </p>
          )}

          {/* Practice UI */}
          <div className="mt-4">
            {isEditing ? (
              <div>
                <textarea
                  value={response}
                  onChange={handleResponseChange}
                  placeholder="Write your response..."
                  className="w-full p-3 border rounded-lg mb-2"
                  style={{
                    borderColor: '#6DA598',
                    minHeight: '100px',
                    color: '#0E3B43',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveResponse}
                    className="px-4 py-2 rounded-lg font-medium"
                    style={{
                      backgroundColor: '#357266',
                      color: 'white',
                    }}
                  >
                    Save Response
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg font-medium text-gray-600 border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: practiced ? '#357266' : '#6DA598' }}
              >
                {practiced ? '✅ Practiced – Edit Response' : '✏️ Practice This Question'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewQuestionsOnly() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs
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

  // Fetch questions by job
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

        const res = await fetch(`/api/interview-insights/${selectedJobId}`, {
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

  // Group questions by category
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

  const selectedJob = jobs.find((j) => j._id === selectedJobId);

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'linear-gradient(to bottom right, #357266, #0E3B43, #357266)' }}
    >
      <div className="max-w-5xl mx-auto">
        <h1
          className="text-4xl md:text-5xl font-bold text-center mb-6"
          style={{
            color: '#FFFFFF',
            textShadow: '2px 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
          }}
        >
          🎯 Interview Questions
        </h1>

        {/* Job Selector */}
        <div className="bg-white rounded-3xl p-6 mb-8 shadow-2xl">
          <label className="block text-lg font-semibold mb-2" style={{ color: '#0E3B43' }}>
            Select a Job:
          </label>
          <select
            className="w-full px-5 py-3 rounded-xl border-2 focus:outline-none text-lg"
            style={{
              borderColor: '#6DA598',
              color: '#0E3B43',
              backgroundColor: 'white',
            }}
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

        {loading && (
          <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
            <p className="text-xl text-gray-600">Loading questions...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <div className="space-y-10">
            {(['behavioral', 'technical', 'situational'] as const).map((cat) => {
              if (grouped[cat].length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-3xl p-8 shadow-2xl">
                  <h2
                    className="text-2xl font-bold mb-6 flex items-center gap-2"
                    style={{ color: '#0E3B43' }}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat === 'behavioral' ? '#4A90E2' : cat === 'technical' ? '#50C878' : '#FFA500' }}
                    ></span>
                    {CATEGORY_LABELS[cat]} Questions
                  </h2>
                  <div className="space-y-5">
                    {grouped[cat].map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={idx + 1}
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
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            <p className="text-gray-500 italic">
              No interview questions available for {selectedJob?.jobTitle} at {selectedJob?.company}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}