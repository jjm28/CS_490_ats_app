import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import { useNavigate } from "react-router-dom";



function getToken() {
  const auth = localStorage.getItem("auth") || localStorage.getItem("authUser");
  if (!auth) return null;
  try {
    const parsed = JSON.parse(auth);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export default function AiOutreachGenerator() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const navigate = useNavigate();


  // ------------------------------------------
  // LOAD CONTACTS & JOBS
  // ------------------------------------------
  useEffect(() => {
    async function loadData() {
      const token = getToken();
      if (!token) {
        setError("You must log in again. No token found.");
        return;
      }

      try {
        const cRes = await fetch(`${API_BASE}/api/networking/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cRes.ok) {
          const cData = await cRes.json();
          setContacts(Array.isArray(cData) ? cData : []);
        } else {
          console.error("Contact load error:", await cRes.text());
          setError("Failed to load contacts.");
        }

        const jRes = await fetch(`${API_BASE}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (jRes.ok) {
          const jData = await jRes.json();
          setJobs(Array.isArray(jData) ? jData : []);
        } else {
          console.error("Job load error:", await jRes.text());
          setError("Failed to load jobs.");
        }
      } catch (err) {
        console.error(err);
        setError("Unexpected error loading data.");
      }
    }

    loadData();
  }, []);

  // ------------------------------------------
  // GENERATE AI MESSAGE
  // ------------------------------------------
  async function handleGenerate() {
    const token = getToken();
    if (!token) {
      setGeneratedMessage(null);
      alert("You must log in again.");
      return;
    }

    if (!selectedContact || !selectedJob) {
      alert("Please select both a contact and a job.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/networking/outreach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactId: selectedContact,
          jobId: selectedJob,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneratedMessage(null);
        alert(`Failed to generate outreach: ${data.error || "Unknown error"}`);
        return;
      }

      setGeneratedMessage(data.message); // 🎉 Show AI message below UI
    } catch (err) {
      console.error(err);
      alert("Error generating message.");
    }
  }

  // ------------------------------------------
  // UI
  // ------------------------------------------
  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">

    {/* Back Button */}
    <button
      onClick={() => navigate("/networking")}
      className="mb-6 px-4 py-2 text-sm font-medium text-gray-700 bg-white border 
                 border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition"
    >
      ← Back to Network Dashboard
    </button>

    {/* Card */}
    <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl p-8 border border-gray-100">

      <h1 className="text-2xl font-bold text-center mb-6 tracking-tight">
        AI Outreach Generator
      </h1>

      {/* CONTACT SELECT */}
      <label className="block mb-4">
        <span className="text-sm font-medium">Select Contact</span>
        <select
          value={selectedContact}
          onChange={(e) => setSelectedContact(e.target.value)}
          className="w-full p-3 mt-1 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
        >
          <option value="">Select Contact</option>
          {contacts.map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.name} — {c.company}
            </option>
          ))}
        </select>
      </label>

      {/* JOB SELECT */}
      <label className="block mb-6">
        <span className="text-sm font-medium">Select Job</span>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full p-3 mt-1 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
        >
          <option value="">Select Job</option>
          {jobs.map((j: any) => (
            <option key={j._id} value={j._id}>
              {j.jobTitle} — {j.company}
            </option>
          ))}
        </select>
      </label>

      {/* BUTTON */}
      <button
        onClick={handleGenerate}
        className="w-full py-3 bg-blue-600 text-white rounded-lg shadow-md text-lg
                   hover:bg-blue-700 transition font-semibold"
      >
        Generate Message
      </button>

      {/* GENERATED MESSAGE */}
      {generatedMessage && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300 shadow-sm">
          <p className="text-sm whitespace-pre-line">{generatedMessage}</p>
        </div>
      )}

    </div>
  </div>
);

}
