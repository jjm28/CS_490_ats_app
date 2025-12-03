import { useState, useEffect } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";

interface FollowUp {
  _id: string;
  type: 'thank_you' | 'status_inquiry' | 'feedback_request' | 'networking';
  subject: string;
  body: string;
  generatedAt: Date;
  customized: boolean;
  sent: boolean;
  sentAt?: Date;
  sentVia: 'email' | 'copied';
  responseReceived: boolean;
  responseDate?: Date;
}

interface InterviewFollowUpProps {
  jobId: string;
  interviewId: string;
  interviewerEmail?: string;
  interviewDate?: Date | string; // ✅ ADD THIS
  existingFollowUps?: FollowUp[];
  onFollowUpUpdate?: () => void;
  compact?: boolean;
}

const followUpTypeInfo: Record<string, { name: string; icon: string; color: string }> = {
  thank_you: { name: "Thank You", icon: "🙏", color: "bg-blue-50 border-blue-200" },
  status_inquiry: { name: "Status Inquiry", icon: "⏰", color: "bg-yellow-50 border-yellow-200" },
  feedback_request: { name: "Feedback Request", icon: "💬", color: "bg-purple-50 border-purple-200" },
  networking: { name: "Networking", icon: "🤝", color: "bg-green-50 border-green-200" },
};

/**
 * Calculate smart timing recommendation based on interview date
 */
function getTimingRecommendation(
  interviewDate: Date | string | undefined,
  followUpType: 'thank_you' | 'status_inquiry' | 'feedback_request' | 'networking'
): {
  daysSince: number | null;
  urgency: 'urgent' | 'ready' | 'soon' | 'wait' | 'no-interview';
  badge: string;
  badgeColor: string;
  message: string;
} {
  if (!interviewDate) {
    return {
      daysSince: null,
      urgency: 'no-interview',
      badge: '',
      badgeColor: '',
      message: ''
    };
  }

  const now = new Date();
  const interviewDateObj = new Date(interviewDate);
  const daysSince = Math.floor((now.getTime() - interviewDateObj.getTime()) / (1000 * 60 * 60 * 24));

  // Define optimal timing windows for each type
  const timingRules = {
    thank_you: {
      optimal: [0, 1], // 0-1 days (within 24 hours)
      good: [2, 2], // Still okay on day 2
      late: [3, 7], // Getting late
      tooLate: 8 // After this, probably too late
    },
    status_inquiry: {
      tooEarly: 4, // Don't send before this
      optimal: [5, 10], // 5-10 days is perfect
      good: [11, 14], // Still reasonable
      urgent: 15 // After 15 days, definitely send
    },
    feedback_request: {
      tooEarly: 1, // Give them at least a day
      optimal: [2, 5], // 2-5 days after rejection
      good: [6, 10],
      late: 11
    },
    networking: {
      tooEarly: 7, // Wait at least a week
      optimal: [7, 21], // 1-3 weeks is good
      good: [22, 30],
      late: 31
    }
  };

  // Calculate recommendation based on type
  switch (followUpType) {
    case 'thank_you':
      if (daysSince <= timingRules.thank_you.optimal[1]) {
        return {
          daysSince,
          urgency: 'urgent',
          badge: '🔥 SEND NOW',
          badgeColor: 'bg-red-100 text-red-700 border-red-300 animate-pulse',
          message: daysSince === 0 
            ? 'Perfect timing - send today!' 
            : daysSince === 1 
            ? 'Still within 24-hour window - send ASAP!' 
            : 'Last chance for 24-hour window!'
        };
      } else if (daysSince <= timingRules.thank_you.good[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '✅ Send Soon',
          badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          message: 'A bit late but still okay to send'
        };
      } else if (daysSince <= timingRules.thank_you.late[1]) {
        return {
          daysSince,
          urgency: 'wait',
          badge: '⏱️ Too Late',
          badgeColor: 'bg-gray-100 text-gray-600 border-gray-300',
          message: 'Consider a different follow-up type instead'
        };
      } else {
        return {
          daysSince,
          urgency: 'wait',
          badge: '❌ Missed Window',
          badgeColor: 'bg-gray-100 text-gray-500 border-gray-300',
          message: 'Thank you window has passed'
        };
      }

    case 'status_inquiry':
      if (daysSince < timingRules.status_inquiry.tooEarly) {
        return {
          daysSince,
          urgency: 'wait',
          badge: '⏳ Wait',
          badgeColor: 'bg-blue-100 text-blue-600 border-blue-300',
          message: `Wait ${timingRules.status_inquiry.tooEarly - daysSince} more day(s) before following up`
        };
      } else if (daysSince >= timingRules.status_inquiry.optimal[0] && daysSince <= timingRules.status_inquiry.optimal[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '✅ SEND NOW',
          badgeColor: 'bg-green-100 text-green-700 border-green-300 font-semibold',
          message: 'Perfect timing window for status inquiry'
        };
      } else if (daysSince <= timingRules.status_inquiry.good[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '👍 Good Time',
          badgeColor: 'bg-green-50 text-green-600 border-green-200',
          message: 'Still a reasonable time to follow up'
        };
      } else {
        return {
          daysSince,
          urgency: 'urgent',
          badge: '🔥 OVERDUE',
          badgeColor: 'bg-red-100 text-red-700 border-red-300 animate-pulse',
          message: 'It\'s been a while - definitely time to follow up!'
        };
      }

    case 'feedback_request':
      if (daysSince < timingRules.feedback_request.tooEarly) {
        return {
          daysSince,
          urgency: 'wait',
          badge: '⏳ Wait',
          badgeColor: 'bg-blue-100 text-blue-600 border-blue-300',
          message: 'Give them a day to process before requesting feedback'
        };
      } else if (daysSince >= timingRules.feedback_request.optimal[0] && daysSince <= timingRules.feedback_request.optimal[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '✅ SEND NOW',
          badgeColor: 'bg-purple-100 text-purple-700 border-purple-300 font-semibold',
          message: 'Good timing to request feedback'
        };
      } else if (daysSince <= timingRules.feedback_request.good[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '👍 Good Time',
          badgeColor: 'bg-purple-50 text-purple-600 border-purple-200',
          message: 'Still appropriate to request feedback'
        };
      } else {
        return {
          daysSince,
          urgency: 'soon',
          badge: '⏰ Send Soon',
          badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          message: 'Getting late but still worth asking'
        };
      }

    case 'networking':
      if (daysSince < timingRules.networking.tooEarly) {
        return {
          daysSince,
          urgency: 'wait',
          badge: '⏳ Wait',
          badgeColor: 'bg-blue-100 text-blue-600 border-blue-300',
          message: `Wait ${timingRules.networking.tooEarly - daysSince} more day(s) - give them space first`
        };
      } else if (daysSince >= timingRules.networking.optimal[0] && daysSince <= timingRules.networking.optimal[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '✅ SEND NOW',
          badgeColor: 'bg-green-100 text-green-700 border-green-300 font-semibold',
          message: 'Perfect timing for networking follow-up'
        };
      } else if (daysSince <= timingRules.networking.good[1]) {
        return {
          daysSince,
          urgency: 'ready',
          badge: '👍 Good Time',
          badgeColor: 'bg-green-50 text-green-600 border-green-200',
          message: 'Still a good time to connect'
        };
      } else {
        return {
          daysSince,
          urgency: 'soon',
          badge: '⏰ Send Soon',
          badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          message: 'Been a while - consider reaching out'
        };
      }

    default:
      return {
        daysSince,
        urgency: 'wait',
        badge: '',
        badgeColor: '',
        message: ''
      };
  }
}

export default function InterviewFollowUp({
  jobId,
  interviewId,
  interviewerEmail,
  interviewDate, // ✅ ADD THIS
  existingFollowUps = [],
  onFollowUpUpdate,
  compact = false
}: InterviewFollowUpProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<FollowUp['type'] | null>(null);
  const [template, setTemplate] = useState<{ subject: string; body: string } | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  const followUpTypes = [
    { 
      value: "thank_you" as const, 
      label: "Thank You Email", 
      desc: "Express gratitude and reiterate interest",
      timing: "⏰ Best sent within 24 hours of interview",
      timingColor: "text-green-700"
    },
    { 
      value: "status_inquiry" as const, 
      label: "Status Inquiry", 
      desc: "Politely ask for hiring timeline update",
      timing: "⏰ Wait 5-7 business days after interview",
      timingColor: "text-yellow-700"
    },
    { 
      value: "feedback_request" as const, 
      label: "Feedback Request", 
      desc: "Request constructive feedback after rejection",
      timing: "⏰ Send 2-3 days after receiving rejection",
      timingColor: "text-purple-700"
    },
    { 
      value: "networking" as const, 
      label: "Networking", 
      desc: "Maintain relationship for future opportunities",
      timing: "⏰ Wait 1-2 weeks after rejection, then connect on LinkedIn",
      timingColor: "text-blue-700"
    },
  ];

  // Generate AI template
  const handleGenerateTemplate = async (type: FollowUp['type']) => {
    setGenerating(true);
    setSelectedType(type);

    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/follow-up/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate template");

      const data = await res.json();
      setTemplate(data);
      setEditedSubject(data.subject);
      setEditedBody(data.body);
    } catch (err) {
      console.error("Error generating template:", err);
      alert("Failed to generate email template");
      setSelectedType(null);
    } finally {
      setGenerating(false);
    }
  };

  // Save follow-up
  const handleSave = async (sendEmail: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/follow-up`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: selectedType,
            subject: editedSubject,
            body: editedBody,
            customized: editedSubject !== template?.subject || editedBody !== template?.body,
            sendEmail,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save follow-up");
      }

      alert(sendEmail ? "Follow-up sent! ✅" : "Follow-up saved! 📝");
      
      // Reset form
      setSelectedType(null);
      setTemplate(null);
      setEditedSubject("");
      setEditedBody("");
      
      onFollowUpUpdate?.();
    } catch (err: any) {
      console.error("Error saving follow-up:", err);
      alert(err.message || "Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    const fullEmail = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(fullEmail);
    alert("Copied to clipboard! 📋");
    handleSave(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-semibold text-sm hover:text-blue-600 transition-colors"
        >
          <span>{expanded ? "▼" : "▶"}</span>
          <span>📧 Interview Follow-Up</span>
        </button>
        
        {existingFollowUps.length > 0 && (
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {existingFollowUps.length} sent
          </span>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3">
          {/* Existing follow-ups */}
          {existingFollowUps.length > 0 && (
            <div className="space-y-2">
              {existingFollowUps.map((fu) => {
                const info = followUpTypeInfo[fu.type];
                return (
                  <div key={fu._id} className={`border rounded-lg p-3 ${info.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {info.icon} {info.name}
                      </span>
                      {fu.sent ? (
                        <span className="text-xs text-green-600">
                          Sent {new Date(fu.sentAt!).toLocaleDateString()} via {fu.sentVia}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Draft</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{fu.subject}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create new follow-up */}
          {!selectedType ? (
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium mb-3">Create a new follow-up:</p>
              <div className="grid grid-cols-2 gap-2">
                {followUpTypes.map((type) => {
                  const timing = getTimingRecommendation(interviewDate, type.value);
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => handleGenerateTemplate(type.value)}
                      disabled={generating}
                      className={`border rounded-lg p-3 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 relative ${
                        timing.urgency === 'urgent' || timing.urgency === 'ready' 
                          ? 'ring-2 ring-offset-1 ring-green-400' 
                          : ''
                      }`}
                    >
                      {/* Timing badge */}
                      {timing.badge && (
                        <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs border ${timing.badgeColor}`}>
                          {timing.badge}
                        </div>
                      )}
                      
                      <span className="text-sm font-medium">{type.label}</span>
                      <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                      
                      {/* Static timing guidance */}
                      <p className={`text-xs mt-2 font-medium ${type.timingColor}`}>
                        {type.timing}
                      </p>
                      
                      {/* Dynamic timing message */}
                      {timing.message && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-700">
                            {timing.daysSince !== null && (
                              <span className="font-semibold">{timing.daysSince} day{timing.daysSince !== 1 ? 's' : ''} since interview · </span>
                            )}
                            {timing.message}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {generating && (
                <div className="text-sm text-gray-600 mt-3 text-center">
                  Generating email template...
                </div>
              )}
            </div>
          ) : (
            /* Edit template */
            <div className="border rounded-lg p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h6 className="font-semibold text-sm">
                      {followUpTypeInfo[selectedType].icon} {followUpTypeInfo[selectedType].name}
                    </h6>
                    {(() => {
                      const timing = getTimingRecommendation(interviewDate, selectedType);
                      return timing.badge ? (
                        <span className={`px-2 py-1 rounded-full text-xs border ${timing.badgeColor}`}>
                          {timing.badge}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  
                  <p className={`text-xs mt-1 font-medium ${followUpTypes.find(t => t.value === selectedType)?.timingColor}`}>
                    {followUpTypes.find(t => t.value === selectedType)?.timing}
                  </p>
                  
                  {(() => {
                    const timing = getTimingRecommendation(interviewDate, selectedType);
                    return timing.message ? (
                      <p className="text-xs mt-1 text-gray-600">
                        {timing.daysSince !== null && (
                          <span className="font-semibold">{timing.daysSince} day{timing.daysSince !== 1 ? 's' : ''} ago · </span>
                        )}
                        {timing.message}
                      </p>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => {
                    setSelectedType(null);
                    setTemplate(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Subject:</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Email Body:</label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full border rounded p-2 text-sm h-48 font-mono"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              {!interviewerEmail && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                  ⚠️ No interviewer email found. Add it in interview details to send via email.
                </div>
              )}

              <div className="flex gap-2">
                {interviewerEmail && (
                  <Button
                    variant="primary"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex-1 text-sm py-2"
                  >
                    {saving ? "Sending..." : "📧 Send Email"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={saving}
                  className="flex-1 text-sm py-2"
                >
                  📋 Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}