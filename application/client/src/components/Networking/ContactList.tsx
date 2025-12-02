import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function authHeaders() {
    const auth = localStorage.getItem("authUser");
    const token = auth ? JSON.parse(auth).token : null;

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/networking/contacts`, {
          headers: authHeaders(),
        });

        if (!res.ok) {
          console.error("Failed to fetch contacts:", await res.text());
          setContacts([]);
          return;
        }

        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading contacts:", err);
        setContacts([]);
      }
    }

    load();
  }, []);

  const filtered = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-gradient-to-r from-[#0A66C2] to-[#004182] 
                   rounded-lg shadow hover:opacity-90 transition"
      >
        ← Back to Network Dashboard
      </button>

      <button
  onClick={() =>
    window.location.href = `${API_BASE}/api/networking/google/oauth`
  }
  className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600"
>
  Import from Google
</button>


      {/* Page Title + Add Contact */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          Professional Contacts
        </h1>

        <Link
          to="/networking/contacts/new"
          className="px-5 py-2.5 text-sm font-semibold text-white
                     bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 
                     transition transform hover:scale-105"
        >
          + Add Contact
        </Link>
      </div>

      {/* Search Box */}
      <div className="relative mb-8">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 pl-11 border rounded-xl shadow-sm
                     bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500
                     transition"
        />
        <span className="absolute left-3 top-3 text-gray-500">🔍</span>
      </div>

      {/* Contacts List */}
      {filtered.length === 0 ? (
        <p className="text-gray-600 text-center italic mt-10">
          No matching contacts found.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((c) => (
            <Link
              to={`/networking/contacts/${c._id}`}
              key={c._id}
              className="group p-5 rounded-xl shadow-md bg-white/70 backdrop-blur 
                         border border-gray-200 transition hover:shadow-lg 
                         hover:-translate-y-1 hover:bg-white"
            >
              <div className="flex items-center gap-4">
                {/* Avatar Bubble */}
                <div className="w-12 h-12 flex items-center justify-center 
                                rounded-full bg-blue-100 text-blue-700 
                                font-bold text-lg shadow-inner">
                  {c.name?.charAt(0).toUpperCase()}
                </div>

                {/* Contact Info */}
                <div>
                  <div className="text-lg font-semibold text-gray-800">
                    {c.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {c.jobTitle || "No title"} @ {c.company || "No company"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
