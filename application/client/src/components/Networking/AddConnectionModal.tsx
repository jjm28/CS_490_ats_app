import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function AddConnectionModal({
  eventId,
  onClose,
  refresh,
}: {
  eventId: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    role: "",
    email: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      alert("Name is required.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");

      console.log("📤 Sending connection:", form);

      await axios.post(
        `/api/networking/events/${eventId}/connections`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      refresh();
      onClose();
    } catch (err: any) {
      console.error("Add connection error:", err);
      alert("Failed to save connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] p-5 rounded shadow-lg relative">
        <button className="absolute right-3 top-3" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-3">Add Connection</h2>

        <div className="space-y-3">
          <input
            name="name"
            placeholder="Full Name"
            className="border p-2 w-full rounded"
            onChange={handleChange}
            value={form.name}
          />

          <input
            name="company"
            placeholder="Company"
            className="border p-2 w-full rounded"
            onChange={handleChange}
            value={form.company}
          />

          <input
            name="role"
            placeholder="Role"
            className="border p-2 w-full rounded"
            onChange={handleChange}
            value={form.role}
          />

          <input
            name="email"
            placeholder="Email"
            className="border p-2 w-full rounded"
            onChange={handleChange}
            value={form.email}
          />

          <textarea
            name="notes"
            placeholder="Notes"
            className="border p-2 w-full rounded h-24 resize-none"
            onChange={handleChange}
            value={form.notes}
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Connection"}
        </button>
      </div>
    </div>
  );
}
