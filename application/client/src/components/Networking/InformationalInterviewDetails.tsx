import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";


/* ---------- Types ---------- */
interface Interview {
  _id: string;
  contactId?: {
    name: string;
    jobTitle?: string;
    company?: string;
  };
  industry?: string;
  role?: string;
  scheduledDate?: string;
  requestMessage?: string;
  prepNotes?: string;
  followUpMessage?: string;
  outcomes?: string;
  impactOnJobSearch?: string;
  insightReport?: string;
  completed?: boolean;
  completedDate?: string | null;
}

/* Auth Helper */
function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export default function InformationalInterviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    requestMessage: "",
    prepNotes: "",
    outcomes: "",
    followUpMessage: "",
    impactOnJobSearch: "",
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/informational/${id}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    setInterview(data);
    setForm({
      requestMessage: data.requestMessage || "",
      prepNotes: data.prepNotes || "",
      outcomes: data.outcomes || "",
      followUpMessage: data.followUpMessage || "",
      impactOnJobSearch: data.impactOnJobSearch || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveChanges() {
    await fetch(`${API_BASE}/api/informational/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(form),
    });
  }

  /* Generic AI generation */
  async function runAI(endpoint: string, updateField: string) {
    setAiLoading(true);
    const res = await fetch(`${API_BASE}/api/informational/${endpoint}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(interview),
    });
    const data = await res.json();

    let value = data.message || data.followUp || JSON.stringify(data, null, 2);

    setForm((prev) => ({ ...prev, [updateField]: value }));
    setInterview((prev) => ({ ...prev!, [updateField]: value }));

    setAiLoading(false);
  }

  async function generateInsights() {
    setInsightLoading(true);
    const res = await fetch(`${API_BASE}/api/informational/${id}/insights`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    setInterview((prev) => ({
      ...prev!,
      insightReport: JSON.stringify(data, null, 2),
    }));
    setInsightLoading(false);
  }

  async function toggleCompleted() {
    if (!interview) return;

    const updated = {
      completed: !interview.completed,
      completedDate: !interview.completed
        ? new Date().toISOString()
        : null,
    };

    await fetch(`${API_BASE}/api/informational/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(updated),
    });

    setInterview((prev) => ({ ...prev!, ...updated }));
  }

    /* ======================= */
  /* 🗑 DELETE INTERVIEW 🆕 */
  /* ======================= */
  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this informational interview?")) return;

    try {
      await fetch(`${API_BASE}/api/informational/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      alert("Interview successfully deleted!");
      navigate("/networking/informational");
    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert("Failed to delete interview.");
    }
  }

  if (loading) return <p className="mt-10 text-center">Loading…</p>;
  if (!interview) return <p className="mt-10 text-center">Interview not found.</p>;

  const contactName = interview.contactId?.name || "Unknown Contact";
  const contactCompany = interview.contactId?.company || "Unknown Company";
  const contactJob = interview.contactId?.jobTitle || "Unknown Role";

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <button
        className="text-blue-600 font-medium mb-6 hover:underline"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="bg-white shadow rounded-xl p-8 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Informational Interview with {contactName}
        </h1>

        <p className="text-center text-gray-600 mt-2 mb-6">
          {contactJob} @ {contactCompany}<br />
          {interview.scheduledDate &&
            <>Scheduled: {new Date(interview.scheduledDate).toLocaleDateString()}<br /></>
          }
          Industry: {interview.industry || "—"} · Role: {interview.role || "—"}
        </p>

        {/* COMPLETION STATUS */}
        {interview.completed && (
          <div className="bg-green-600 text-white text-center py-3 rounded-md mb-8">
            <strong>🎯 Interview Completed</strong><br />
            Completed on: {new Date(interview.completedDate!).toLocaleDateString()}
          </div>
        )}

        {/* MAIN INPUT SECTIONS */}
        {[
          { label: "Request Message", key: "requestMessage", ai: "generate-request" },
          { label: "Prep Notes", key: "prepNotes", ai: "prep" },
          { label: "Outcomes", key: "outcomes" },
          { label: "Follow-Up Message", key: "followUpMessage", ai: "followup" },
          { label: "Impact On Job Search", key: "impactOnJobSearch" }
        ].map((field) => (
          <div key={field.key} className="mb-8">
            <label className="font-semibold text-gray-800 block mb-1">
              {field.label}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={(form as any)[field.key]}
              onChange={(e) =>
                setForm({ ...form, [field.key]: e.target.value })
              }
            />
            {field.ai && (
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => runAI(field.ai, field.key)}
                className="mt-2 px-4 py-1.5 text-sm rounded bg-blue-700 hover:bg-blue-800 text-white shadow"
              >
                {aiLoading ? "Generating…" : `Generate with AI`}
              </button>
            )}
          </div>
        ))}

        <div className="flex gap-4 mt-8 mb-10">
          <button
            onClick={saveChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow"
          >
            Save Changes
          </button>

          <button
            onClick={toggleCompleted}
            className={`px-6 py-2 font-semibold rounded shadow text-white ${
              interview.completed
                ? "bg-gray-500 hover:bg-gray-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {interview.completed ? "Undo Completed" : "Mark as Completed"}
          </button>

                    {/* 🗑 DELETE BUTTON */}
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded shadow"
          >
            Delete Interview
          </button>
        </div>

        {/* AI INSIGHTS */}
        <h2 className="text-xl font-semibold text-gray-800 text-center mt-10 mb-3">
          AI Insights
        </h2>

        {interview.insightReport ? (
          <>
            <pre className="bg-gray-900 text-white text-xs p-4 rounded-lg whitespace-pre-wrap max-h-[400px] overflow-y-auto shadow-inner">
              {interview.insightReport}
            </pre>

            <div className="text-center mt-4">
              <button
                disabled={insightLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
                onClick={generateInsights}
              >
                {insightLoading ? "Working…" : "Regenerate Insights"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <button
              disabled={insightLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
              onClick={generateInsights}
            >
              {insightLoading ? "Working…" : "Generate Insights"}
            </button>
          </div>
        )}

        {/* FUTURE OPPORTUNITIES */}
        <div className="mt-16 text-center border-t pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Future Opportunities
          </h2>
          <p className="text-gray-500 mb-4">
            If this contact can support your job search, request a referral below.
          </p>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded shadow"
            onClick={() =>
              navigate(`/referrals/request`)
            }
          >
            Request Referral from {contactName}
          </button>
        </div>
      </div>
    </div>
  );
}
