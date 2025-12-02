import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Contact } from "../../api/contact";
import { getContact, setReminder } from "../../api/contact";

export default function ReminderManager() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<string>("");

  // -----------------------------
  // LOAD CONTACT
  // -----------------------------
  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const data = await getContact(id as string); // <-- FIXED
        setContact(data);

        // Pre-fill the date selector if reminder exists
        if (data.reminderDate) {
          setDate(data.reminderDate.split("T")[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // -----------------------------
  // SAVE REMINDER
  // -----------------------------
  async function handleSave() {
    if (!id || !date) return;

    try {
      await setReminder(id, date);
      navigate(`/networking/contacts/${id}`);
    } catch (err) {
      console.error("Failed to save reminder:", err);
      alert("Failed to save reminder.");
    }
  }

  // -----------------------------
  // CLEAR REMINDER
  // -----------------------------
  async function handleClear() {
    if (!id) return;

    try {
      await setReminder(id, ""); // backend should treat empty string as removal
      navigate(`/networking/contacts/${id}`);
    } catch (err) {
      console.error("Failed to clear reminder:", err);
      alert("Failed to clear reminder.");
    }
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  if (loading) return <div>Loading contact…</div>;
  if (!contact) return <div>Contact not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-700 underline mb-4"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-2">Manage Reminder</h1>
      <p className="text-gray-700 mb-4">For {contact.name}</p>

      {/* CURRENT REMINDER */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Current Reminder</h3>
        {contact.reminderDate ? (
          <p className="p-3 bg-yellow-50 border rounded">
            You have a reminder set for:{" "}
            <strong>
              {new Date(contact.reminderDate).toLocaleDateString()}
            </strong>
          </p>
        ) : (
          <p className="p-3 bg-gray-50 border rounded">
            No reminder currently set.
          </p>
        )}
      </div>

      {/* SET NEW DATE */}
      <label className="block mb-4">
        <span className="font-medium">Choose Follow-up Date</span>
        <input
          type="date"
          className="w-full border p-2 rounded mt-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save Reminder
        </button>

        {contact.reminderDate && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Clear Reminder
          </button>
        )}
      </div>
    </div>
  );
}
