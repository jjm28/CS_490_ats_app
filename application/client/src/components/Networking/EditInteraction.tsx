import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

export default function EditInteraction() {
  const { id, interactionId } = useParams();
  const navigate = useNavigate();

  const [type, setType] = useState("");
  const [note, setNote] = useState("");

  function authHeaders() {
    const raw = localStorage.getItem("authUser");
    const token = raw ? JSON.parse(raw).token : null;
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `${API_BASE}/api/networking/contacts/${id}/interactions`,
        { headers: authHeaders() }
      );

      const data = await res.json();
      const item = data.interactions.find((x: any) => x.interactionId === interactionId);

      if (item) {
        setType(item.type);
        setNote(item.note);
      }
    }
    load();
  }, [id, interactionId]);

  async function save() {
    await fetch(
      `${API_BASE}/api/networking/interactions/${id}/${interactionId}`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ type, note }),
      }
    );

    navigate(`/networking/contacts/${id}`);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="underline mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-bold mb-4">Edit Interaction</h1>

      <label className="block mb-4">
        <span className="font-medium">Type</span>
        <select
          className="w-full border p-2 mt-1 rounded"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="Call">Call</option>
          <option value="Email">Email</option>
          <option value="Meeting">Meeting</option>
        </select>
      </label>

      <label className="block mb-4">
        <span className="font-medium">Notes</span>
        <textarea
          className="w-full border p-2 rounded"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        onClick={save}
        className="px-6 py-3 bg-emerald-600 text-white rounded"
      >
        Save Changes
      </button>
    </div>
  );
}
