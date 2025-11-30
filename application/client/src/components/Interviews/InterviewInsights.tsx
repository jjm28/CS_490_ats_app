import { useEffect, useState } from "react";

type Job = {
  _id: string;
  jobTitle: string;
  company: string;
};

type Insights = {
  processStages: string[];
  commonQuestions: string[];
  interviewFormat: string;
  timeline: string;
  preparationTips: string[];
  successTips: string[];
  interviewerInfo: string;
  error?: string;
};

// Timeline Component
type TimelineProps = {
  stages: string[];
};

function Timeline({ stages }: TimelineProps) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return <p className="text-gray-500 italic">No stages available</p>;
  }

  return (
    <div className="relative pl-12">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

      {/* Stages */}
      <div className="space-y-6">
        {stages.map((stage, index) => (
          <div key={index} className="relative flex items-start">
            {/* Stage number circle */}
            <div 
              className="absolute -left-12 z-10 flex items-center justify-center w-8 h-8 text-white rounded-full font-semibold text-sm"
              style={{ backgroundColor: '#357266' }}
            >
              {index + 1}
            </div>

            {/* Stage content */}
            <div className="flex-1">
              <div 
                className="p-5 rounded-xl border hover:shadow-md transition-shadow"
                style={{ 
                  background: 'linear-gradient(to bottom right, #f9fafb, #e8f3ef)',
                  borderColor: '#A3BBAD'
                }}
              >
                <p className="font-medium leading-relaxed" style={{ color: '#0E3B43' }}>
                  {stage}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tip Card Component
type TipCardProps = {
  icon: string;
  text: string;
};

function TipCard({ icon, text }: TipCardProps) {
  return (
    <div 
      className="p-6 rounded-xl border-l-4 hover:translate-x-1 hover:shadow-lg transition-all"
      style={{ 
        background: 'linear-gradient(to bottom right, #f9fafb, #e8f3ef)',
        borderLeftColor: '#357266'
      }}
    >
      <div className="flex items-start gap-3">
        <span 
          className="flex-shrink-0 w-7 h-7 text-white rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: '#357266' }}
        >
          {icon}
        </span>
        <p className="text-base leading-relaxed" style={{ color: '#0E3B43' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// Question Card Component
type QuestionCardProps = {
  question: string;
  index: number;
};

function QuestionCard({ question, index }: QuestionCardProps) {
  return (
    <div 
      className="p-5 rounded-xl border hover:shadow-md transition-all"
      style={{ 
        background: 'linear-gradient(to bottom right, #ffffff, #e8f3ef)',
        borderColor: '#6DA598'
      }}
    >
      <div className="flex items-start gap-4">
        <span 
          className="flex-shrink-0 w-8 h-8 text-white rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: '#357266' }}
        >
          Q{index + 1}
        </span>
        <p className="font-medium leading-relaxed pt-1" style={{ color: '#0E3B43' }}>
          {question}
        </p>
      </div>
    </div>
  );
}

// Info Section Component
type InfoSectionProps = {
  title: string;
  content: string;
  icon?: string;
};

function InfoSection({ title, content, icon = "ℹ️" }: InfoSectionProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-10 shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: '#0E3B43' }}>
        <div 
          className="w-1.5 h-10 rounded-full"
          style={{ background: 'linear-gradient(to bottom, #357266, #0E3B43)' }}
        ></div>
        {title}
      </h2>
      <div 
        className="p-6 rounded-xl border"
        style={{ 
          background: 'linear-gradient(to bottom right, #f9fafb, #e8f3ef)',
          borderColor: '#A3BBAD'
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <p className="leading-relaxed text-lg" style={{ color: '#0E3B43' }}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InterviewInsightsSelector() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all user jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token")?.trim();

        const res = await fetch("/api/jobs", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log("Jobs API Response:", data);

        if (Array.isArray(data)) setJobs(data);
        else setJobs([]);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
      }
    };

    fetchJobs();
  }, []);

  // Fetch insights when a job is selected
  const fetchInsights = async (jobId: string) => {
    setLoading(true);
    setInsights(null);

    try {
      const token = localStorage.getItem("token")?.trim();
      if (!token) {
        throw new Error("No token found");
      }

      const res = await fetch(`/api/interview-insights/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        setInsights({ error: errorData.error || "Failed to load insights" } as Insights);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setInsights(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching insights:", error);
      setInsights({ error: "Network error or server failed" } as Insights);
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen p-8"
      style={{ background: 'linear-gradient(to bottom right, #357266, #0E3B43, #357266)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Title */}
        <h1 
          className="text-6xl font-bold text-center mb-8"
          style={{ 
            color: '#FFFFFF',
            textShadow: '2px 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
            letterSpacing: '1px'
          }}
        >
          🎯 Interview Insights
        </h1>

        {/* Dropdown */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <label className="text-xl font-semibold" style={{ color: '#0E3B43' }}>
              Select a Job:
            </label>
            <select
              className="px-6 py-3 rounded-xl border-2 focus:outline-none cursor-pointer text-lg min-w-[300px] bg-white"
              style={{ 
                borderColor: '#6DA598',
                color: '#0E3B43'
              }}
              value={selectedJobId}
              onChange={(e) => {
                const jobId = e.target.value;
                setSelectedJobId(jobId);
                if (jobId) fetchInsights(jobId);
              }}
              onFocus={(e) => e.target.style.borderColor = '#357266'}
              onBlur={(e) => e.target.style.borderColor = '#6DA598'}
            >
              <option value="">-- Select Job --</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.jobTitle} – {job.company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="animate-pulse">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4"
                style={{ backgroundColor: '#357266' }}
              ></div>
              <p className="text-xl text-gray-600">Loading insights...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {insights?.error && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div 
              className="border-l-4 p-6 rounded-xl"
              style={{ 
                backgroundColor: '#fee2e2',
                borderLeftColor: '#CC0000'
              }}
            >
              <p className="text-lg font-medium" style={{ color: '#CC0000' }}>
                ⚠️ {insights.error}
              </p>
            </div>
          </div>
        )}

        {/* Insights Display */}
        {insights && !insights.error && (
          <div className="space-y-8">
            {/* Interview Process Timeline */}
            {insights.processStages && insights.processStages.length > 0 && (
              <div className="bg-white rounded-3xl p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3" style={{ color: '#0E3B43' }}>
                  <div 
                    className="w-1.5 h-10 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #357266, #0E3B43)' }}
                  ></div>
                  Interview Process Timeline
                </h2>
                <Timeline stages={insights.processStages} />
              </div>
            )}

            {/* Common Questions */}
            {insights.commonQuestions && insights.commonQuestions.length > 0 && (
              <div className="bg-white rounded-3xl p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3" style={{ color: '#0E3B43' }}>
                  <div 
                    className="w-1.5 h-10 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #357266, #0E3B43)' }}
                  ></div>
                  Common Questions
                </h2>
                <div className="space-y-4">
                  {insights.commonQuestions.map((question, index) => (
                    <QuestionCard key={index} question={question} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Interview Format */}
            <InfoSection 
              title="Interview Format" 
              content={insights.interviewFormat} 
              icon="📋"
            />

            {/* Timeline Info */}
            <InfoSection 
              title="Expected Timeline" 
              content={insights.timeline} 
              icon="⏱️"
            />

            {/* Preparation Tips */}
            {insights.preparationTips && insights.preparationTips.length > 0 && (
              <div className="bg-white rounded-3xl p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3" style={{ color: '#0E3B43' }}>
                  <div 
                    className="w-1.5 h-10 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #357266, #0E3B43)' }}
                  ></div>
                  Preparation Tips
                </h2>
                <div className="space-y-5">
                  {insights.preparationTips.map((tip, index) => (
                    <TipCard key={index} icon="📚" text={tip} />
                  ))}
                </div>
              </div>
            )}

            {/* Success Tips */}
            {insights.successTips && insights.successTips.length > 0 && (
              <div className="bg-white rounded-3xl p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3" style={{ color: '#0E3B43' }}>
                  <div 
                    className="w-1.5 h-10 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #357266, #0E3B43)' }}
                  ></div>
                  Success Tips
                </h2>
                <div className="space-y-5">
                  {insights.successTips.map((tip, index) => (
                    <TipCard key={index} icon="🚀" text={tip} />
                  ))}
                </div>
              </div>
            )}

            {/* Interviewer Info */}
            <InfoSection 
              title="Interviewer Information" 
              content={insights.interviewerInfo} 
              icon="👤"
            />
          </div>
        )}
      </div>
    </div>
  );
}