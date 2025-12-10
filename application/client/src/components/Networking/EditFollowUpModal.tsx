import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function EditFollowUpModal({
  eventId,
  index,
  followUp,
  onClose,
  refresh,
}: {
  eventId: string;
  index: number;
  followUp: any;
  onClose: () => void;
  refresh: () => void;
}) {
  const [form, setForm] = useState({
    note: followUp.note || "",
    date: followUp.date ? followUp.date.substring(0, 10) : "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    if (!form.note || !form.date) {
      alert("All fields required.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      await axios.put(
        `/api/networking/events/${eventId}/followups/${index}`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      refresh();
      onClose();
    } catch (err) {
      console.error("Edit follow-up error:", err);
      alert("Failed to update follow-up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] p-5 rounded shadow-lg relative">
        <button
          className="absolute right-3 top-3 text-gray-600"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">Edit Follow-Up</h2>

        <div className="space-y-4">
          <textarea
            name="note"
            placeholder="Note"
            className="border p-2 rounded w-full h-28 resize-none"
            value={form.note}
            onChange={handleChange}
          />

          <input
            type="date"
            name="date"
            className="border p-2 rounded w-full"
            value={form.date}
            onChange={handleChange}
          />
        </div>

        <button
          className="mt-5 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
          onClick={submit}
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
