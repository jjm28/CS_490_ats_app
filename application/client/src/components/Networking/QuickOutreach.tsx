import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getContact, addInteraction } from "../../api/contact";
import {
  getAllOutreachTemplates,
  updateContactHealth,
} from "../../api/relationship";
import type { Contact } from "../../api/contact";
import type { AllTemplates } from "../../api/relationship";
import { Send, Copy, Check } from "lucide-react";
import API_BASE from "../../utils/apiBase";

export default function QuickOutreach() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [templates, setTemplates] = useState<AllTemplates | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);

        // Check for pending share FIRST
        const pendingShare = localStorage.getItem("pendingShare");
        const hasPendingShare = !!pendingShare;

        // Load contact and templates
        const [contactData, templatesData] = await Promise.all([
          getContact(id!),
          getAllOutreachTemplates(id!),
        ]);

        setContact(contactData);
        setTemplates(templatesData);

        // If there's a pending share, use that instead of default template
        if (hasPendingShare) {
          try {
            const { template } = JSON.parse(pendingShare!);
            setSubject(template.subject);
            setMessage(template.message);
            setSelectedTemplate("custom");

            // Clear the pending share
            localStorage.removeItem("pendingShare");
          } catch (err) {
            console.error("Failed to parse pending share:", err);
            // Fall back to default template
            setSubject(templatesData.general.subject);
            setMessage(templatesData.general.message);
            setSelectedTemplate("general");
          }
        } else {
          // No pending share, use default template
          setSubject(templatesData.general.subject);
          setMessage(templatesData.general.message);
          setSelectedTemplate("general");
        }
      } catch (err) {
        console.error("Failed to load outreach data:", err);
        alert("Failed to load outreach data");
        navigate("/networking");
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [id, navigate]);

  function handleTemplateChange(templateType: string) {
    if (!templates) return;

    setSelectedTemplate(templateType);
    const template = templates[templateType as keyof AllTemplates];
    setSubject(template.subject);
    setMessage(template.message);
  }

  async function handleCopy() {
    const fullMessage = `Subject: ${subject}\n\n${message}`;
    await navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMarkAsSent() {
    if (!contact) return;

    try {
      setSending(true);

      // Add interaction
      await addInteraction(contact._id, {
        type: "Email/Message",
        note: `Sent: ${subject}`,
      });

      // Update relationship health
      await updateContactHealth(contact._id);

      alert("Marked as sent! Relationship health updated.");
      navigate(`/networking/contacts/${contact._id}`);
    } catch (err) {
      console.error("Failed to mark as sent:", err);
      alert("Failed to mark as sent");
    } finally {
      setSending(false);
    }
  }

  async function handleSendEmail() {
    if (!contact || !contact.email) {
      alert("This contact doesn't have an email address on file.");
      return;
    }

    if (!window.confirm(`Send this email to ${contact.email}?`)) {
      return;
    }

    try {
      setSendingEmail(true);

      const token = JSON.parse(localStorage.getItem("authUser") || "{}").token;

      const res = await fetch(`${API_BASE}/api/networking/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientEmail: contact.email,
          subject,
          body: message,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send email");
      }

      // Add interaction
      await addInteraction(contact._id, {
        type: "Email Sent",
        note: `Sent: ${subject}`,
      });

      // Update relationship health
      await updateContactHealth(contact._id);

      alert("Email sent successfully! Relationship health updated.");
      navigate(`/networking/contacts/${contact._id}`);
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Failed to send email. Please try copying the message instead.");
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-pulse">
        Loading outreach templates...
      </div>
    );
  }

  if (!contact || !templates) {
    return (
      <div className="text-center mt-20 text-red-600">
        Failed to load contact or templates
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/networking/contacts/${contact._id}`)}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 transition"
      >
        ← Back to Contact
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Quick Outreach: {contact.name}
        </h1>
        <p className="text-gray-600 mt-2">
          {contact.jobTitle || "Unknown role"} @{" "}
          {contact.company || "Unknown company"}
        </p>
      </div>

      {/* Template Selection */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Choose Template Type
          {selectedTemplate === "custom" && (
            <span className="ml-3 text-sm font-normal text-emerald-600">
              (Custom - News Share)
            </span>
          )}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.keys(templates).map((templateType) => (
            <button
              key={templateType}
              onClick={() => handleTemplateChange(templateType)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedTemplate === templateType
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {templateType
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {selectedTemplate === "custom" && (
          <p className="text-sm text-gray-600 mt-3">
            💡 This is a custom message with shared news content. You can edit
            it freely or select a template above to start over.
          </p>
        )}
      </div>

      {/* Message Composer */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Compose Your Message
        </h2>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                         font-mono text-sm"
            />
          </div>

          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Personalize the template by adding specific
            details about your relationship or recent news about their company.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleCopy}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 
                     rounded-lg hover:bg-gray-50 transition font-medium
                     flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy to Clipboard
            </>
          )}
        </button>

        {contact.email && (
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg 
                 hover:bg-blue-700 transition font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {sendingEmail ? "Sending..." : "Send Email"}
          </button>
        )}

        <button
          onClick={handleMarkAsSent}
          disabled={sending}
          className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg 
                     hover:bg-emerald-700 transition font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {sending ? "Saving..." : "Mark as Sent"}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📧 Outreach Tips</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Keep it concise - respect their time</li>
          <li>• Be specific about why you're reaching out</li>
          <li>• Reference something recent about them or their company</li>
          <li>• Make it easy for them to respond (clear ask, simple yes/no)</li>
          <li>• Follow up if no response after 7-10 days</li>
        </ul>
      </div>
    </div>
  );
}
