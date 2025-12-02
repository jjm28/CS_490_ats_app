// src/components/Networking/AddInteraction.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";

export default function AddInteraction() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [type, setType] = useState("Call");
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
    const res = await fetch(
      `${API_BASE}/api/networking/interactions/${id}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type, note }),
      }
    );

    if (res.ok) {
      navigate(`/networking/interactions/${id}`);
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
              <option>Call</option>
              <option>Email</option>
              <option>Meeting</option>
              <option>Referral</option>
              <option>Follow-up</option>
            </select>
          </label>

          {/* NOTES */}
          <label className="block mb-6">
            <span className="text-gray-700 font-medium">Notes</span>
            <textarea
              className="w-full border mt-2 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 resize-none"
              rows={7}
              placeholder="What happened during this interaction?"
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
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
