import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import ReferralRequestModal from "./ReferralRequestModal";
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

export default function ReferralRequestPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [tone, setTone] = useState("professional");
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // --------------------------------------------------
  // Load jobs + contacts just like AIOutreachGenerator
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) {
        alert("You must log in again.");
        return;
      }

      try {
        // ---- CONTACTS ----
        const cRes = await fetch(`${API_BASE}/api/networking/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cRes.ok) {
          const cData = await cRes.json();
          setContacts(Array.isArray(cData) ? cData : []);
        } else {
          console.error("Contacts load error:", await cRes.text());
        }

        // ---- JOBS ----
        const jRes = await fetch(`${API_BASE}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (jRes.ok) {
          const jData = await jRes.json();
          setJobs(Array.isArray(jData) ? jData : []);
        } else {
          console.error("Jobs load error:", await jRes.text());
        }
      } catch (err) {
        console.error("ReferralRequest load error:", err);
      }
    }

    load();
  }, []);

  const canGenerate = selectedContact && selectedJob;

  // --------------------------------------------------
  // Build the selected objects to pass into the modal
  // --------------------------------------------------
  const selectedContactObj = contacts.find((c) => c._id === selectedContact);
  const selectedJobObj = jobs.find((j) => j._id === selectedJob);

return (
  <div className="w-full min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center">
    
    {/* Back Button */}
    <button
      onClick={() => navigate("/networking")}
      className="mb-6 text-sm px-4 py-2 rounded-md border border-gray-300 
                 hover:bg-gray-100 transition"
    >
      ← Back to Network Dashboard
    </button>

    {/* Card Container */}
    <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-xl">
      <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-8">
        Request a Referral
      </h1>

      {/* CONTACT SELECT */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">
          Choose Contact
        </label>
        <select
          value={selectedContact}
          onChange={(e) => setSelectedContact(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 
                     bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a contact…</option>
          {contacts.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} — {c.company}
            </option>
          ))}
        </select>
      </div>

      {/* JOB SELECT */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-semibold">
          Choose Job
        </label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 
                     bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a job…</option>
          {jobs.map((job) => (
            <option key={job._id} value={job._id}>
              {job.jobTitle} — {job.company}
            </option>
          ))}
        </select>
      </div>

      {/* TONE SELECT */}
      <div className="mb-8">
        <label className="block text-gray-700 mb-2 font-semibold">
          Message Tone
        </label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 
                     bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="concise">Concise</option>
        </select>
      </div>

      {/* BUTTON */}
      <button
        disabled={!canGenerate}
        onClick={() => setShowModal(true)}
        className={`w-full py-3 rounded-lg text-lg font-semibold transition ${
          canGenerate
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        Generate Referral Request
      </button>
    </div>

    {/* MODAL */}
    {showModal && (
      <ReferralRequestModal
        contact={selectedContactObj}
        job={selectedJobObj}
        tone={tone}
        onClose={() => setShowModal(false)}
        reload={() => {}}
      />
    )}
  </div>
);

}
