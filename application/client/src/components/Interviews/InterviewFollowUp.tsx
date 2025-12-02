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

export default function InterviewFollowUp({
  jobId,
  interviewId,
  interviewerEmail,
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
    { value: "thank_you" as const, label: "Thank You Email", desc: "Send after the interview" },
    { value: "status_inquiry" as const, label: "Status Inquiry", desc: "Follow up on hiring timeline" },
    { value: "feedback_request" as const, label: "Feedback Request", desc: "Ask for constructive feedback" },
    { value: "networking" as const, label: "Networking", desc: "Stay connected for future opportunities" },
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
                {followUpTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleGenerateTemplate(type.value)}
                    disabled={generating}
                    className="border rounded-lg p-3 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                  </button>
                ))}
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
                <h6 className="font-semibold text-sm">
                  {followUpTypeInfo[selectedType].icon} {followUpTypeInfo[selectedType].name}
                </h6>
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