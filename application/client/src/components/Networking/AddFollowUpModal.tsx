import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function AddFollowUpModal({
  eventId,
  onClose,
  refresh,
}: {
  eventId: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  const submit = async () => {
    if (!note.trim()) {
      alert("Please enter a note.");
      return;
    }

    if (!date) {
      alert("Please select a due date.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      console.log("📤 SENDING FOLLOW-UP:", { note, date });

      await axios.post(
        `/api/networking/events/${eventId}/followups`,
        { note: note.trim(), date },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      refresh();
      onClose();
    } catch (err) {
      console.error("Add follow-up error:", err);
      alert("Failed to add follow-up.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-5 w-[400px] rounded shadow-lg relative">
        <button className="absolute right-3 top-3" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-3">Add Follow-Up</h2>

        <div className="space-y-3">
          <div>
            <label className="block mb-1 font-medium">Due Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Note:</label>
            <textarea
              placeholder="e.g., Send thank-you email"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border p-2 w-full rounded h-24 resize-none"
            />
          </div>
        </div>

        <button
          onClick={submit}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Follow-Up
        </button>
        
      </div>
    </div>
  );
}
