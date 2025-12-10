import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function AddEventModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    industry: "",
    location: "",
    date: "",
    type: "in-person",
    goals: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const submitEvent = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("❌ No JWT token found in localStorage");
      alert("You must be logged in to add events.");
      return;
    }

    const res = await axios.post(
      "/api/networking/events",
      {
        title: form.title,
        industry: form.industry,
        location: form.location,
        date: form.date,
        type: form.type,
        goals: form.goals.split(",").map((g) => g.trim()),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    onAdded();
    onClose();
  } catch (err) {
    console.error("❌ Error adding event:", err);
  }
};


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[450px] p-6 shadow-lg relative">
        <button onClick={onClose} className="absolute right-3 top-3">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4">Add Networking Event</h2>

        <div className="space-y-3">
          <input
            name="title"
            placeholder="Event Title"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <input
            name="industry"
            placeholder="Industry"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <input
            name="location"
            placeholder="Location"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <input
            type="date"
            name="date"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />

          <select
            name="type"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          >
            <option value="in-person">In-Person</option>
            <option value="virtual">Virtual</option>
          </select>

          <textarea
            name="goals"
            placeholder="Goals (comma separated)"
            className="border p-2 w-full rounded"
            onChange={handleChange}
          />
        </div>

        <button
          onClick={submitEvent}
          className="mt-4 bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
        >
          Add Event
        </button>
      </div>
    </div>
  );
}
