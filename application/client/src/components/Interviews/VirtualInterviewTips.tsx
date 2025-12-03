// src/components/Interviews/VirtualInterviewTips.tsx
import { useState, useEffect } from 'react';
import API_BASE from '../../utils/apiBase';

type TipsData = {
  technicalSetup: string[];
  professionalPresence: string[];
  communicationBestPractices: string[];
  commonPitfalls: string[];
  preInterviewChecklist: string[];
};

type VirtualInterviewTipsProps = {
  jobId?: string;
  jobTitle?: string;
  company?: string;
};

export default function VirtualInterviewTips({ 
  jobId, 
  jobTitle, 
  company 
}: VirtualInterviewTipsProps) {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const [tips, setTips] = useState<TipsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (jobTitle) {
      fetchTips();
    }
  }, [jobTitle, company]);

  const fetchTips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview-insights/generate-virtual-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobTitle,
          company,
          interviewType: 'Video interview (Zoom/Teams)'
        })
      });

      if (!res.ok) throw new Error('Failed to fetch tips');

      const data = await res.json();
      setTips(data.tips);
    } catch (err) {
      console.error('Error fetching virtual tips:', err);
      // Use default tips if API fails
      setTips(getDefaultTips());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTips = (): TipsData => ({
    technicalSetup: [
      'Test your camera, microphone, and internet connection 30 minutes before',
      'Position camera at eye level with good lighting from the front',
      'Use a neutral, clutter-free background or virtual background',
      'Close unnecessary applications to prevent notifications'
    ],
    professionalPresence: [
      'Dress professionally from head to toe',
      'Look at the camera when speaking to simulate eye contact',
      'Sit up straight with good posture throughout the interview',
      'Use natural hand gestures but keep them in frame'
    ],
    communicationBestPractices: [
      'Speak slightly slower than normal to account for audio lag',
      'Pause after answering to give the interviewer time to respond',
      'Use the chat feature to share links or clarify spellings',
      'Smile and nod to show engagement even when not speaking'
    ],
    commonPitfalls: [
      'Avoid looking at yourself on screen - focus on the camera',
      "Don't interrupt - video lag can make this awkward",
      'Mute when not speaking to avoid background noise',
      "Don't read directly from notes - it's obvious on video"
    ],
    preInterviewChecklist: [
      'Join the call 5 minutes early',
      'Have the job description and your resume visible',
      'Keep water nearby (out of frame)',
      'Test screen sharing if needed'
    ]
  });

  if (!tips && !loading) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">💻</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Virtual Interview Tips
            </h3>
            <p className="text-sm text-gray-600">
              {jobTitle ? `Tailored for ${jobTitle}` : 'Best practices for remote interviews'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-gray-600">
          Generating personalized tips...
        </div>
      )}

      {expanded && tips && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Technical Setup */}
          <TipCard
            icon="🎥"
            title="Technical Setup"
            tips={tips.technicalSetup}
            color="blue"
          />

          {/* Professional Presence */}
          <TipCard
            icon="👔"
            title="Professional Presence"
            tips={tips.professionalPresence}
            color="purple"
          />

          {/* Communication */}
          <TipCard
            icon="💬"
            title="Communication"
            tips={tips.communicationBestPractices}
            color="green"
          />

          {/* Common Pitfalls */}
          <TipCard
            icon="⚠️"
            title="Avoid These Mistakes"
            tips={tips.commonPitfalls}
            color="red"
          />

          {/* Pre-Interview Checklist */}
          <TipCard
            icon="✅"
            title="Pre-Interview Checklist"
            tips={tips.preInterviewChecklist}
            color="teal"
          />
        </div>
      )}
    </div>
  );
}

type TipCardProps = {
  icon: string;
  title: string;
  tips: string[];
  color: 'blue' | 'purple' | 'green' | 'red' | 'teal';
};

function TipCard({ icon, title, tips, color }: TipCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    teal: 'bg-teal-50 border-teal-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, idx) => (
          <li key={idx} className="text-sm text-gray-700 flex gap-2">
            <span className="text-gray-400">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
