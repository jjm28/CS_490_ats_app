import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";
import {
  updateContactHealth,
  updateEngagementFrequency,
  markOpportunityGenerated,
} from "../../api/relationship";
import { Heart, TrendingUp, Award, Clock, Send } from "lucide-react";

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingHealth, setUpdatingHealth] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [opportunityDescription, setOpportunityDescription] = useState("");

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
    if (!window.confirm("Are you sure you want to delete this contact?"))
      return;

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

  // Refresh relationship health
  async function handleRefreshHealth() {
    if (!contact) return;

    try {
      setUpdatingHealth(true);
      const updated = await updateContactHealth(contact._id);
      setContact(updated);
      alert("Relationship health updated!");
    } catch (err) {
      console.error("Failed to update health:", err);
      alert("Failed to update relationship health");
    } finally {
      setUpdatingHealth(false);
    }
  }

  // Update engagement frequency
  async function handleUpdateFrequency(frequency: string) {
    if (!contact) return;

    try {
      const updated = await updateEngagementFrequency(contact._id, frequency);
      setContact(updated);
      setShowFrequencyModal(false);
      alert("Engagement frequency updated!");
    } catch (err) {
      console.error("Failed to update frequency:", err);
      alert("Failed to update engagement frequency");
    }
  }

  // Mark opportunity generated
  async function handleMarkOpportunity() {
    if (!contact) return;

    try {
      const updated = await markOpportunityGenerated(
        contact._id,
        opportunityDescription
      );
      setContact(updated);
      setShowOpportunityModal(false);
      setOpportunityDescription("");
      alert("Opportunity marked! This interaction has been tracked.");
    } catch (err) {
      console.error("Failed to mark opportunity:", err);
      alert("Failed to mark opportunity");
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">Loading contact…</div>
    );
  if (!contact)
    return (
      <div className="p-8 text-red-600 text-center">
        Failed to load contact.
      </div>
    );

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
          <div
            className="w-20 h-20 flex items-center justify-center rounded-full 
                        bg-blue-100 text-blue-700 text-3xl font-bold shadow-inner mb-4"
          >
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

        {/* RELATIONSHIP HEALTH SECTION - NEW */}
        <div className="mb-10 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-600" />
              Relationship Health
            </h2>
            <button
              onClick={handleRefreshHealth}
              disabled={updatingHealth}
              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg 
                       hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {updatingHealth ? "Updating..." : "Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Health Status */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <p
                className={`text-lg font-bold ${
                  contact.relationshipHealth === "excellent"
                    ? "text-green-600"
                    : contact.relationshipHealth === "good"
                    ? "text-blue-600"
                    : contact.relationshipHealth === "needs_attention"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {contact.relationshipHealth
                  ? contact.relationshipHealth.replace(/_/g, " ").toUpperCase()
                  : "UNKNOWN"}
              </p>
            </div>

            {/* Days Since Last Contact */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Days Since Contact</p>
              <p className="text-lg font-bold text-gray-800">
                {contact.daysSinceLastContact ?? "—"}
              </p>
            </div>

            {/* Total Outreach */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Total Outreach</p>
              <p className="text-lg font-bold text-gray-800">
                {contact.totalOutreachCount ?? 0}
              </p>
            </div>

            {/* Opportunities Generated */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Opportunities</p>
              <p className="text-lg font-bold text-emerald-600">
                {contact.opportunitiesGenerated ?? 0}
              </p>
            </div>

            {/* Reciprocity Score - NEW */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Reciprocity</p>
              <p
                className={`text-lg font-bold ${
                  (contact.reciprocityScore ?? 50) >= 70
                    ? "text-green-600"
                    : (contact.reciprocityScore ?? 50) >= 40
                    ? "text-blue-600"
                    : "text-orange-600"
                }`}
              >
                {contact.reciprocityScore ?? 50}/100
              </p>
            </div>
          </div>

          {/* Engagement Frequency */}
          <div className="mt-4 flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Engagement Frequency:
                <span className="ml-2 font-semibold">
                  {contact.engagementFrequency
                    ? contact.engagementFrequency.charAt(0).toUpperCase() +
                      contact.engagementFrequency.slice(1)
                    : "Monthly"}
                </span>
              </span>
            </div>
            <button
              onClick={() => setShowFrequencyModal(true)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Change
            </button>
          </div>

          {/* Next Suggested Contact */}
          {contact.nextSuggestedContact && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next suggested contact:</strong>{" "}
                {new Date(contact.nextSuggestedContact).toLocaleDateString()}
              </p>
            </div>
          )}
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
            to={`/networking/contacts/${id}/outreach`}
            className="px-6 py-3 text-white bg-emerald-600 hover:bg-emerald-700 shadow rounded-xl 
                     transition transform hover:scale-[1.03] flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Quick Outreach
          </Link>

          <button
            onClick={() => setShowOpportunityModal(true)}
            className="px-6 py-3 text-white bg-purple-600 hover:bg-purple-700 shadow rounded-xl 
                     transition transform hover:scale-[1.03] flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            Mark Opportunity
          </button>

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
            className="px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 shadow rounded-xl 
                     transition transform hover:scale-[1.03]"
          >
            Add Interaction
          </Link>
        </div>

        {/* RECENT INTERACTIONS */}
        <Section title="Recent Interactions">
          {contact.interactions.length === 0 ? (
            <p className="text-center text-gray-500 italic">
              No interactions recorded yet.
            </p>
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
          <NoteBlock
            title="Professional Notes"
            value={contact.professionalNotes}
          />
        </Section>
      </div>

      {/* Engagement Frequency Modal */}
      {showFrequencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Set Engagement Frequency
            </h2>
            <p className="text-gray-600 mb-6">
              How often should you reach out to {contact.name}?
            </p>

            <div className="space-y-3">
              {["weekly", "biweekly", "monthly", "quarterly", "yearly"].map(
                (freq) => (
                  <button
                    key={freq}
                    onClick={() => handleUpdateFrequency(freq)}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                      contact.engagementFrequency === freq
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setShowFrequencyModal(false)}
              className="mt-6 w-full px-4 py-2 border border-gray-300 text-gray-700 
                       rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mark Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Mark Opportunity Generated
            </h2>
            <p className="text-gray-600 mb-4">
              What opportunity did {contact.name} help generate?
            </p>

            <textarea
              value={opportunityDescription}
              onChange={(e) => setOpportunityDescription(e.target.value)}
              placeholder="e.g., Referral to XYZ Company, Job lead at ABC Corp..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowOpportunityModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                         rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkOpportunity}
                disabled={!opportunityDescription.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg 
                         hover:bg-emerald-700 transition disabled:opacity-50 
                         disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
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
