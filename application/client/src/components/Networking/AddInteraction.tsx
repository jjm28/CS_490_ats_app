// src/components/Networking/AddInteraction.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";

export default function AddInteraction() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [type, setType] = useState("Email/Message");
  const [note, setNote] = useState("");

  function authHeaders() {
    const raw = localStorage.getItem("authUser");
    const token = raw ? JSON.parse(raw).token : null;
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  // Load contact name
  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        setContact(await res.json());
      }
    }
    load();
  }, [id]);

  async function save() {
    if (!note.trim()) {
      alert("Please add a note about this interaction.");
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/networking/interactions/${id}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type, note }),
      }
    );

    if (res.ok) {
      navigate(`/networking/contacts/${id}`);
    } else {
      alert("Failed to save interaction.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        <Link
          to={`/networking/contacts/${id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Contact
        </Link>

        {/* CARD CONTAINER */}
        <div className="mt-6 bg-white p-8 rounded-xl shadow-lg border">

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Add Interaction
          </h1>

          {contact && (
            <p className="text-center text-gray-600 mb-6">
              For <span className="font-semibold">{contact.name}</span>
            </p>
          )}

          {/* INTERACTION TYPE */}
          <label className="block mb-5">
            <span className="text-gray-700 font-medium">Interaction Type</span>
            <select
              className="w-full border mt-2 p-3 rounded-lg focus:ring-2 focus:ring-blue-400"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {/* OUTBOUND - You initiated */}
              <optgroup label="📤 Outbound (You Initiated)">
                <option value="Email/Message">Email/Message</option>
                <option value="Outbound Call">Outbound Call</option>
                <option value="Follow-up">Follow-up</option>
                <option value="I Reached Out">I Reached Out</option>
                <option value="Request Sent">Request Sent</option>
                <option value="Coffee/Lunch">Coffee/Lunch (You Invited)</option>
              </optgroup>

              {/* INBOUND - They initiated */}
              <optgroup label="📥 Inbound (They Initiated)">
                <option value="Inbound Call">Inbound Call</option>
                <option value="They Reached Out">They Reached Out</option>
                <option value="Job Referral Received">Job Referral Received</option>
                <option value="Introduction Received">Introduction Received</option>
                <option value="Advice Received">Advice Received</option>
                <option value="Opportunity Shared by Them">Opportunity Shared by Them</option>
              </optgroup>

              {/* MUTUAL - Both engaged */}
              <optgroup label="🤝 Mutual (Both Engaged)">
                <option value="Meeting">Meeting</option>
                <option value="Video Call">Video Call</option>
                <option value="Coffee">Coffee</option>
                <option value="Lunch">Lunch</option>
                <option value="Networking Event">Networking Event</option>
                <option value="Event">Event/Conference</option>
              </optgroup>

              {/* OTHER */}
              <optgroup label="📝 Other">
                <option value="Opportunity Generated">Opportunity Generated</option>
                <option value="Note">General Note</option>
              </optgroup>
            </select>
          </label>

          {/* Helper Text */}
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Choose the correct category to track reciprocity accurately:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
              <li>• <strong>Outbound</strong> = You initiated the contact</li>
              <li>• <strong>Inbound</strong> = They reached out to you</li>
              <li>• <strong>Mutual</strong> = Both participated equally</li>
            </ul>
          </div>

          {/* NOTES */}
          <label className="block mb-6">
            <span className="text-gray-700 font-medium">Notes</span>
            <textarea
              className="w-full border mt-2 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 resize-none"
              rows={7}
              placeholder="What happened during this interaction? Be specific to help track reciprocity..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {/* BUTTON ROW */}
          <div className="flex justify-center gap-4">
            <button
              onClick={save}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg shadow hover:bg-green-700 transition"
            >
              Save Interaction
            </button>

            <button
              onClick={() => setNote("")}
              className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg shadow hover:bg-gray-300 transition"
            >
              Clear Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}