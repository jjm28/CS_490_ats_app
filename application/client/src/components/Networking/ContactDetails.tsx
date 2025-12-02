import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  function authHeaders() {
    const raw = localStorage.getItem("authUser");
    const token = raw ? JSON.parse(raw).token : null;

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  // Load contact on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
          headers: authHeaders(),
        });

        if (res.ok) {
          const data = await res.json();
          setContact(data);
        }
      } catch (err) {
        console.error("Failed to load contact", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // Delete contact
  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (res.ok) navigate("/networking/contacts");
      else alert("Failed to delete contact.");
    } catch {
      alert("Error deleting contact.");
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-600">Loading contact…</div>;
  if (!contact)
    return <div className="p-8 text-red-600 text-center">Failed to load contact.</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking/contacts")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-gradient-to-r from-[#0A66C2] to-[#004182]
                   rounded-lg shadow hover:opacity-90 transition"
      >
        ← Back to Contacts
      </button>

      {/* Main Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border p-10">

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* Avatar */}
          <div className="w-20 h-20 flex items-center justify-center rounded-full 
                          bg-blue-100 text-blue-700 text-3xl font-bold shadow-inner mb-4">
            {contact.name.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
            {contact.name}
          </h1>

          <p className="text-gray-600 text-lg">
            {contact.jobTitle || "—"} @ {contact.company || "—"}
          </p>

          <div className="mt-4 text-sm text-gray-500">
            Relationship Strength:
            <span className="ml-2 font-semibold text-emerald-700">
              {contact.relationshipStrength ?? "—"}/100
            </span>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700 text-lg mb-10">
          <Info label="Email" value={contact.email} />
          <Info label="Phone" value={contact.phone} />
          <Info label="Industry" value={contact.industry} />
          <Info label="Relationship" value={contact.relationshipType} />
          <Info
            label="Reminder"
            value={
              contact.reminderDate
                ? new Date(contact.reminderDate).toLocaleDateString()
                : "—"
            }
          />
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Tags</p>
            <div className="flex flex-wrap gap-2">
              {contact.tags?.length ? (
                contact.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <p className="text-gray-500">—</p>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Link
            to={`/networking/contacts/${id}/edit`}
            className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 shadow rounded-xl 
                       transition transform hover:scale-[1.03]"
          >
            Edit Contact
          </Link>

          <button
            onClick={handleDelete}
            className="px-6 py-3 text-white bg-red-600 hover:bg-red-700 shadow rounded-xl 
                       transition transform hover:scale-[1.03]"
          >
            Delete Contact
          </button>

          <Link
            to={`/networking/interactions/${id}`}
            className="px-6 py-3 text-white bg-gray-700 hover:bg-gray-800 shadow rounded-xl 
                       transition transform hover:scale-[1.03]"
          >
            View History
          </Link>

          <Link
            to={`/networking/interactions/${id}/add`}
            className="px-6 py-3 text-white bg-emerald-600 hover:bg-emerald-700 shadow rounded-xl 
                       transition transform hover:scale-[1.03]"
          >
            Add Interaction
          </Link>
        </div>

        {/* RECENT INTERACTIONS */}
        <Section title="Recent Interactions">
          {contact.interactions.length === 0 ? (
            <p className="text-center text-gray-500 italic">No interactions recorded yet.</p>
          ) : (
            <div className="space-y-4 mt-4">
              {contact.interactions.slice(0, 3).map((i, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 border rounded-xl shadow-sm hover:bg-gray-100 transition"
                >
                  <div className="font-semibold text-lg">{i.type}</div>
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(i.date).toLocaleString()}
                  </div>
                  <p>{i.note}</p>
                </div>
              ))}

              <Link
                to={`/networking/interactions/${id}`}
                className="text-center block mt-2 text-blue-600 underline hover:text-blue-800"
              >
                View All →
              </Link>
            </div>
          )}
        </Section>

        {/* NOTES */}
        <Section title="Notes">
          <NoteBlock title="Personal Notes" value={contact.personalNotes} />
          <NoteBlock title="Professional Notes" value={contact.professionalNotes} />
        </Section>
      </div>
    </div>
  );
}

/* Small UI components for clean code */
function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-gray-800 text-lg">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold text-center mb-4">{title}</h2>
      {children}
    </div>
  );
}

function NoteBlock({ title, value }: any) {
  return (
    <div className="mb-6">
      <p className="font-semibold text-center text-gray-700">{title}</p>
      <p className="text-center mt-1 text-gray-600">{value || "—"}</p>
    </div>
  );
}
