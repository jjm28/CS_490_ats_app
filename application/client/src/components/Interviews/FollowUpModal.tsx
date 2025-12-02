import { useState } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import type { FollowUp } from "../../types/jobs.types";

interface FollowUpModalProps {
  jobId: string;
  interviewId: string;
  interviewerEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FollowUpModal({
  jobId,
  interviewId,
  interviewerEmail,
  onClose,
  onSuccess,
}: FollowUpModalProps) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [selectedType, setSelectedType] =
    useState<FollowUp["type"]>("thank_you");
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";

  const followUpTypes = [
    {
      value: "thank_you",
      label: "Thank You Email",
      desc: "Send after the interview",
    },
    {
      value: "status_inquiry",
      label: "Status Inquiry",
      desc: "Follow up on hiring timeline",
    },
    {
      value: "feedback_request",
      label: "Feedback Request",
      desc: "Ask for constructive feedback",
    },
    {
      value: "networking",
      label: "Networking",
      desc: "Stay connected for future opportunities",
    },
  ];

  /** Generate AI template */
  const handleGenerate = async () => {
    setLoading(true);

    console.log("🌐 Frontend: Generating follow-up");
    console.log("  jobId:", jobId);
    console.log("  interviewId:", interviewId);
    console.log("  type:", selectedType);
    console.log(
      "  URL:",
      `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/follow-up/generate`
    );

    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/follow-up/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: selectedType }),
        }
      );

      console.log("📡 Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Error response:", errorData);
        throw new Error(errorData.error || "Failed to generate template");
      }

      const data = await res.json();
      console.log("✅ Success:", data);
      // ... rest of your code
    } catch (err) {
      console.error("Error generating template:", err);
      alert("Failed to generate email template");
    } finally {
      setLoading(false);
    }
  };

  /** Save and optionally send */
  const handleSave = async (sendEmail: boolean) => {
    setLoading(true);
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
            customized:
              editedSubject !== template?.subject ||
              editedBody !== template?.body,
            sendEmail,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save follow-up");
      }

      alert(sendEmail ? "Follow-up sent! ✅" : "Follow-up saved! 📝");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving follow-up:", err);
      alert(err.message || "Failed to save follow-up");
    } finally {
      setLoading(false);
    }
  };

  /** Copy to clipboard */
  const handleCopy = () => {
    const fullEmail = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(fullEmail);
    alert("Copied to clipboard! 📋");
    handleSave(false); // Save as "copied"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold">Interview Follow-Up</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose the type of follow-up email:
              </p>

              {followUpTypes.map((type) => (
                <label
                  key={type.value}
                  className={`block border rounded-lg p-4 cursor-pointer transition ${
                    selectedType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="followUpType"
                    value={type.value}
                    checked={selectedType === type.value}
                    onChange={(e) =>
                      setSelectedType(e.target.value as FollowUp["type"])
                    }
                    className="mr-3"
                  />
                  <span className="font-medium">{type.label}</span>
                  <p className="text-sm text-gray-500 ml-6">{type.desc}</p>
                </label>
              ))}

              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? "Generating..." : "Generate Email →"}
              </Button>
            </div>
          )}

          {step === "preview" && template && (
            <div className="space-y-4">
              <button
                onClick={() => setStep("select")}
                className="text-sm text-blue-600 hover:underline mb-4"
              >
                ← Back to selection
              </button>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subject:
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full border rounded p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Body:
                </label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full border rounded p-2 h-64 font-mono text-sm"
                />
              </div>

              {!interviewerEmail && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  ⚠️ No interviewer email found. Add it in the interview details
                  to send via email.
                </div>
              )}

              <div className="flex gap-3">
                {interviewerEmail && (
                  <Button
                    variant="primary"
                    onClick={() => handleSave(true)}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Sending..." : "Send Email"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={loading}
                  className="flex-1"
                >
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
