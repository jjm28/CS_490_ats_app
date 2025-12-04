import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export default function MentorInvite() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    relationship: "",
    permissions: {
      shareProfile: true,
      shareApplications: true,
      shareAnalytics: false,
    },
  });

  const [loading, setLoading] = useState(false);

  function updatePermission(key: string) {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key as keyof typeof prev.permissions],
      },
    }));
  }

  async function sendInvite() {
    if (!form.email || !form.relationship) {
      return alert("Please fill all required fields!");
    }

    setLoading(true);

    const res = await fetch(`${API_BASE}/api/mentors/invite`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      console.error(data);
      return alert("Failed to send invite");
    }

    navigate("/networking/mentors");
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-6">
      <button onClick={() => navigate(-1)} className="text-blue-600 mb-4">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center mb-6">
        Invite a Mentor or Career Coach
      </h1>

      {/* Email */}
      <label className="font-semibold block mb-1">Mentor Email *</label>
      <input
        type="email"
        className="border p-2 rounded w-full mb-4"
        placeholder="mentor@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      {/* Relationship */}
      <label className="font-semibold block mb-1">Relationship *</label>
      <input
        type="text"
        className="border p-2 rounded w-full mb-4"
        placeholder="e.g. College advisor, former manager"
        value={form.relationship}
        onChange={(e) => setForm({ ...form, relationship: e.target.value })}
      />

      {/* Permissions */}
      <h3 className="font-semibold mb-2">Permissions</h3>

      {[
        { label: "Share profile details", key: "shareProfile" },
        { label: "Share job applications", key: "shareApplications" },
        { label: "Share analytics & progress insights", key: "shareAnalytics" },
      ].map((p) => (
        <label key={p.key} className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={form.permissions[p.key as keyof typeof form.permissions]}
            onChange={() => updatePermission(p.key)}
          />
          {p.label}
        </label>
      ))}

      {/* Submit Button */}
      <button
        disabled={loading}
        className="bg-purple-600 text-white mt-6 w-full py-3 rounded-md shadow hover:bg-purple-700"
        onClick={sendInvite}
      >
        {loading ? "Sending…" : "Send Invite"}
      </button>
    </div>
  );
}
