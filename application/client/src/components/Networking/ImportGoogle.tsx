import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

type GoogleContact = {
  name: string;
  email: string;
  jobTitle?: string;
  company?: string;
};

export default function ImportGoogle() {
  const [params] = useSearchParams();
  const googleToken = params.get("token");

  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Google Contacts
  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch(`${API_BASE}/api/networking/google/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: googleToken }),
        });

        const data = await res.json();
        setContacts(data.contacts);
      } catch (error) {
        console.error("Failed to load Google contacts:", error);
      } finally {
        setLoading(false);
      }
    }

    if (googleToken) loadContacts();
  }, [googleToken]);

  // Save to Networking Contacts DB
  async function handleAddContact(c: GoogleContact) {
    const raw = localStorage.getItem("authUser");
    const auth = raw ? JSON.parse(raw) : null;
    const token = auth?.token;
    const userId = auth?.user?._id;

    if (!token || !userId) {
      alert("Authentication error — please log in again.");
      return;
    }

    const payload = {
      userid: userId,
      name: c.name || "Unknown Name",
      email: c.email,
      jobTitle: c.jobTitle || "",
      company: c.company || "",
      relationshipStrength: 30,
    };

    try {
      const res = await fetch(`${API_BASE}/api/networking/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed request");

      alert(`Successfully added ${c.name}!`);

      // Remove from list after adding
      setContacts((prev) => prev.filter((x) => x.email !== c.email));

    } catch (err) {
      console.error("Failed to add contact:", err);
      alert("Failed to add contact.");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">Google Contacts</h1>

      {loading && <p className="text-center text-gray-500">Loading...</p>}

      {!loading && contacts.length === 0 && (
        <p className="text-center text-gray-400 italic">No contacts found.</p>
      )}

      {contacts.map((c, i) => (
        <div
          key={i}
          className="flex justify-between items-center border p-4 rounded-xl shadow-sm bg-white mb-3"
        >
          <div>
            <p className="font-semibold text-gray-900">{c.name}</p>
            <p className="text-gray-600 text-sm">{c.email}</p>
          </div>

          <button
            onClick={() => handleAddContact(c)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Add Contact
          </button>
        </div>
      ))}
    </div>
  );
}
