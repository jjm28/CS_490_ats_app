import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface Interaction {
  interactionId: string;
  type: string;
  note: string;
  date: string;
}

interface Contact {
  _id: string;
  fullname: string;
  interactions?: Interaction[];
}

export default function InteractionHistory() {
  const { id: contactId } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  /* =======================================================
     LOAD INTERACTIONS
  ======================================================= */
  async function loadInteractions() {
    try {
      const resContact = await fetch(
        `http://localhost:5050/api/networking/contacts/${contactId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const resInteractions = await fetch(
        `http://localhost:5050/api/networking/contacts/${contactId}/interactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!resContact.ok || !resInteractions.ok)
        throw new Error("Failed loading data");

      const contactData = await resContact.json();
      const interactionData = (await resInteractions.json()) as Interaction[];

      setContact(contactData);
      setInteractions(
        interactionData.sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    } catch (err) {
      console.error("LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInteractions();
  }, [contactId]);

  /* =======================================================
     DELETE INTERACTION
  ======================================================= */
  async function deleteInteraction(interactionId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;

    try {
      const res = await fetch(
        `http://localhost:5050/api/networking/interactions/${contactId}/${interactionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        alert("Failed to delete interaction.");
        return;
      }

      // Update UI
      setInteractions((prev) =>
        prev.filter((i) => i.interactionId !== interactionId)
      );
    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert("Error deleting interaction.");
    }
  }

  /* =======================================================
     UI RENDERING LOGIC
  ======================================================= */

  if (loading)
    return (
      <p className="text-center mt-16 text-gray-600">Loading interactions…</p>
    );

  if (!contact)
    return (
      <p className="text-center mt-20 text-red-600">
        Unable to load contact data.
      </p>
    );

  return (
    <div className="max-w-3xl mx-auto py-10">
      <Link
        to={`/networking/contacts/${contactId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to Contact
      </Link>

      <h1 className="text-3xl font-bold mt-6 text-center">
        Interaction History for <span className="capitalize">{contact.fullname}</span>
      </h1>

      <div className="flex justify-center mt-6">
        <Link
          to={`/networking/interactions/${contactId}/add`}
          className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
        >
          + Add Interaction
        </Link>
      </div>

      {/* No interactions */}
      {interactions.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          No recorded interactions yet.
        </p>
      ) : (
        <div className="mt-10 space-y-4">
          {interactions.map((i) => (
            <div
              key={i.interactionId}
              className="bg-white shadow rounded-lg p-4 flex justify-between items-center border"
            >
              <div>
                <div className="text-lg font-semibold">{i.type}</div>
                <div className="text-sm text-gray-500">
                  {new Date(i.date).toLocaleString()}
                </div>
                <p className="mt-2">{i.note}</p>
              </div>

              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                onClick={() => deleteInteraction(i.interactionId)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
