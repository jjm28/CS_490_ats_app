import React, { useEffect, useState } from "react";
import API_BASE from "../../utils/apiBase";
import { useNavigate } from "react-router-dom";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */
interface Contact {
  _id: string;
  name: string;
  email?: string;
  jobTitle?: string;
  company?: string;
}

interface InterviewCreatePayload {
  contactId: string;
  scheduledDate: string;
  requestMessage: string;
  prepNotes: string;
  outcomes: string;
  followUpMessage: string;
  impactOnJobSearch: string;
  questionsToAsk: string[];
  researchChecklist: string[];
  conversationFlow: string[];
}

function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

/* ---------------------------------------------------------
   PAGE COMPONENT
--------------------------------------------------------- */
export default function NewInformationalInterview() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [form, setForm] = useState<InterviewCreatePayload>({
    contactId: "",
    scheduledDate: "",
    requestMessage: "",
    prepNotes: "",
    outcomes: "",
    followUpMessage: "",
    impactOnJobSearch: "",
    questionsToAsk: [],
    researchChecklist: [],
    conversationFlow: [],
  });

  /* ---------------------------------------------------------
     LOAD CONTACTS FOR DROPDOWN
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch(`${API_BASE}/api/networking/contacts`, {
          headers: authHeaders(),
        });

        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load contacts:", err);
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    }

    loadContacts();
  }, []);

  /* ---------------------------------------------------------
     HANDLE FORM INPUTS
  --------------------------------------------------------- */
  function updateField<K extends keyof InterviewCreatePayload>(
    key: K,
    value: InterviewCreatePayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ---------------------------------------------------------
     SUBMIT FORM
  --------------------------------------------------------- */
  async function createInterview() {
    try {
      const res = await fetch(`${API_BASE}/api/informational`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Error creating interview");

      navigate("/networking/informational");
    } catch (err) {
      console.error("Failed to create interview:", err);
      alert("Error creating interview");
    }
  }

  /* ---------------------------------------------------------
     RENDER UI
  --------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Request Informational Interview</h1>

      <div className="space-y-6">
        {/* Contact Dropdown */}
        <div>
          <label className="block font-semibold mb-1">Select Contact</label>
          {loadingContacts ? (
            <p>Loading...</p>
          ) : (
            <select
              className="w-full p-3 border rounded"
              value={form.contactId}
              onChange={(e) => updateField("contactId", e.target.value)}
            >
              <option value="">-- Select Contact --</option>
              {contacts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.company ? `• ${c.company}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Scheduled Date */}
        <div>
          <label className="block font-semibold mb-1">Scheduled Date</label>
          <input
            type="date"
            className="w-full p-3 border rounded"
            value={form.scheduledDate}
            onChange={(e) => updateField("scheduledDate", e.target.value)}
          />
        </div>

        {/* Request Message */}
        <div>
          <label className="block font-semibold mb-1">Request Message</label>
          <textarea
            className="w-full p-3 border rounded"
            rows={4}
            value={form.requestMessage}
            onChange={(e) => updateField("requestMessage", e.target.value)}
          />
        </div>

        {/* Prep Notes */}
        <div>
          <label className="block font-semibold mb-1">Prep Notes</label>
          <textarea
            className="w-full p-3 border rounded"
            rows={4}
            value={form.prepNotes}
            onChange={(e) => updateField("prepNotes", e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={createInterview}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Create Interview
        </button>
      </div>
    </div>
  );
}
