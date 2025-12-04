import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Calendar, MapPin, BadgeInfo } from "lucide-react";
import AddEventModal from "./AddEventModal";
import { useNavigate } from "react-router-dom";

interface NetworkingEvent {
  _id: string;
  title: string;
  industry?: string;
  location?: string;
  type: string;
  date: string;
  goals: string[];
  attendanceStatus: string;
}

export default function NetworkingEventsPage() {
  const [events, setEvents] = useState<NetworkingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await axios.get("/api/networking/events", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(res.data)) {
        setEvents(res.data);
      } else {
        console.warn("Unexpected events response:", res.data);
        setEvents([]);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
            {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-6 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
      >
        ← Back to Network Dashboard
      </button>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Networking Events</h1>

        <button
          onClick={() => setOpenModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-gray-500 text-center text-sm">Loading events...</p>
      )}

      {/* Events */}
      <div className="space-y-4">
        {events.map((ev) => (
          <div
            key={ev._id}
            onClick={() => navigate(`/networking/events/${ev._id}`)}
            className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex justify-between items-start">
              {/* Left side */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {ev.title}
                </h2>

                <p className="text-gray-600 mt-1 text-sm flex items-center gap-2">
                  <BadgeInfo size={14} />
                  {ev.industry || "No industry"} •{" "}
                  {ev.location || "No location"}
                </p>

                <p className="text-gray-700 text-sm mt-1 flex items-center gap-1">
                  <Calendar size={14} />
                  {ev.date
                    ? new Date(ev.date).toLocaleDateString()
                    : "No date provided"}
                </p>
              </div>

              {/* Right side — tags */}
              <div className="flex flex-col items-end gap-2">
                {/* Event Type */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize
                  ${
                    ev.type === "virtual"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {ev.type}
                </span>

                {/* Attendance Status */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize
                  ${
                    ev.attendanceStatus === "planning"
                      ? "bg-yellow-100 text-yellow-700"
                      : ev.attendanceStatus === "attended"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {ev.attendanceStatus}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!loading && events.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p className="italic">No events added yet.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {openModal && (
        <AddEventModal
          onClose={() => setOpenModal(false)}
          onAdded={fetchEvents}
        />
      )}
    </div>
  );
}
