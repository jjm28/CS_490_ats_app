// src/components/Interviews/WritingPracticeDashboard.tsx
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import API_BASE from '../../utils/apiBase';

type ProgressData = {
  date: string;
  overallScore: number;
  structureScore: number;
  clarityScore: number;
  storytellingScore: number;
  responseCount: number;
};

type WritingPracticeDashboardProps = {
  selectedJobId?: string;
};

export default function WritingPracticeDashboard({ selectedJobId }: WritingPracticeDashboardProps) {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalResponses: 0,
    overallTrend: 0,
    firstSessionDate: null as Date | null,
    lastSessionDate: null as Date | null
  });

  useEffect(() => {
    fetchProgress();
  }, [selectedJobId]);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedJobId 
        ? `${API_BASE}/api/writing-practice/progress?jobId=${selectedJobId}`
        : `${API_BASE}/api/writing-practice/progress`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch progress data');

      const data = await res.json();
      
      // Format dates for display
      const formattedData = data.progressData.map((d: any) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

      setProgressData(formattedData);
      setStats({
        totalSessions: data.totalSessions,
        totalResponses: data.totalResponses,
        overallTrend: data.overallTrend,
        firstSessionDate: data.firstSessionDate ? new Date(data.firstSessionDate) : null,
        lastSessionDate: data.lastSessionDate ? new Date(data.lastSessionDate) : null
      });

    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading progress data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Practice Sessions Yet
        </h3>
        <p className="text-gray-600">
          Complete your first practice session to see your progress here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon="📝"
          label="Total Sessions"
          value={stats.totalSessions.toString()}
          color="blue"
        />
        <StatCard
          icon="✍️"
          label="Total Responses"
          value={stats.totalResponses.toString()}
          color="green"
        />
        <StatCard
          icon={stats.overallTrend >= 0 ? "📈" : "📉"}
          label="Overall Trend"
          value={stats.overallTrend >= 0 ? `+${stats.overallTrend}` : stats.overallTrend.toString()}
          color={stats.overallTrend >= 0 ? "green" : "red"}
          suffix=" pts"
        />
        <StatCard
          icon="📅"
          label="Days Practicing"
          value={calculateDaysPracticing(stats.firstSessionDate, stats.lastSessionDate).toString()}
          color="purple"
        />
      </div>

      {/* Overall Score Trend */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📈 Overall Score Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overallScore" 
              stroke="#2563eb" 
              strokeWidth={3}
              name="Overall Score"
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          🎯 Score Breakdown by Category
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="structureScore" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Structure"
            />
            <Line 
              type="monotone" 
              dataKey="clarityScore" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Clarity"
            />
            <Line 
              type="monotone" 
              dataKey="storytellingScore" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Storytelling"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Response Volume */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📊 Practice Volume
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="responseCount" 
              fill="#3b82f6" 
              name="Responses per Session"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💡</span> Key Insights
        </h3>
        <div className="space-y-3">
          {stats.overallTrend > 10 && (
            <InsightCard
              icon="🎉"
              text={`Great progress! Your scores have improved by ${stats.overallTrend} points.`}
              color="green"
            />
          )}
          {stats.overallTrend < -5 && (
            <InsightCard
              icon="🤔"
              text="Scores have dipped slightly. Try focusing on one area at a time and reviewing AI feedback carefully."
              color="yellow"
            />
          )}
          {stats.totalSessions >= 10 && (
            <InsightCard
              icon="🔥"
              text={`Consistency pays off! You've completed ${stats.totalSessions} practice sessions.`}
              color="blue"
            />
          )}
          {progressData.length > 0 && getBestCategory(progressData[progressData.length - 1]) && (
            <InsightCard
              icon="⭐"
              text={`Your strongest area is ${getBestCategory(progressData[progressData.length - 1])}!`}
              color="purple"
            />
          )}
          {progressData.length > 0 && getWeakestCategory(progressData[progressData.length - 1]) && (
            <InsightCard
              icon="📚"
              text={`Focus on improving ${getWeakestCategory(progressData[progressData.length - 1])} in your next sessions.`}
              color="orange"
            />
          )}
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  icon: string;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'red' | 'purple';
  suffix?: string;
};

function StatCard({ icon, label, value, color, suffix = '' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold">
        {value}{suffix}
      </div>
    </div>
  );
}

type InsightCardProps = {
  icon: string;
  text: string;
  color: 'green' | 'yellow' | 'blue' | 'purple' | 'orange';
};

function InsightCard({ icon, text, color }: InsightCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-3 flex items-start gap-3`}>
      <span className="text-xl">{icon}</span>
      <p className="text-sm text-gray-700 flex-1">{text}</p>
    </div>
  );
}

// Helper functions
function calculateDaysPracticing(firstDate: Date | null, lastDate: Date | null): number {
  if (!firstDate || !lastDate) return 0;
  const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getBestCategory(data: ProgressData): string | null {
  const scores = {
    Structure: data.structureScore,
    Clarity: data.clarityScore,
    Storytelling: data.storytellingScore
  };

  const validScores = Object.entries(scores).filter(([_, score]) => score > 0);
  if (validScores.length === 0) return null;

  const best = validScores.reduce((max, curr) => curr[1] > max[1] ? curr : max);
  return best[0];
}

function getWeakestCategory(data: ProgressData): string | null {
  const scores = {
    Structure: data.structureScore,
    Clarity: data.clarityScore,
    Storytelling: data.storytellingScore
  };

  const validScores = Object.entries(scores).filter(([_, score]) => score > 0);
  if (validScores.length === 0) return null;

  const weakest = validScores.reduce((min, curr) => curr[1] < min[1] ? curr : min);
  return weakest[0];
}
