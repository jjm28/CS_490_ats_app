import { useState } from "react";
import axios from "axios";
import { Calendar, MapPin, Globe, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ---- TYPE FOR AI-GENERATED EVENTS ----
interface AINetworkingEvent {
  title: string;
  date: string;
  location: string;
  venue: string;
  type: string;
  description: string;
  expected_attendance?: string;
  topics?: string[];
}

export default function DiscoverEvents() {
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [events, setEvents] = useState<AINetworkingEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const search = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      const res = await axios.post(
        "/api/networking/discover-ai",
        { industry, location },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (Array.isArray(res.data)) {
        setEvents(res.data);
      } else {
        console.warn("Unexpected AI event data:", res.data);
        setEvents([]);
      }
    } catch (err) {
      console.error("Discover AI error:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const saveEvent = async (ev: AINetworkingEvent) => {
    try {
      const token = localStorage.getItem("authToken");

      await axios.post(
        "/api/networking/events",
        {
          title: ev.title,
          industry,
          location: ev.location || location,
          date: ev.date,
          type: ev.type,
          description: ev.description,
          goals: [],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Event added!");
    } catch (err) {
      console.error(err);
      alert("Failed to save event");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-6 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
      >
        ← Back to Network Dashboard
      </button>

      {/* Card */}
      <div className="bg-white shadow-md rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Discover Networking Events
        </h1>

        {/* Search Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            placeholder="Industry (e.g., Software Engineering)"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="border rounded-lg p-3 w-full focus:ring focus:ring-blue-200 focus:border-blue-400"
          />
          <input
            placeholder="Location (e.g., New York)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border rounded-lg p-3 w-full focus:ring focus:ring-blue-200 focus:border-blue-400"
          />
          <button
            onClick={search}
            className="bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 transition w-full"
          >
            Search
          </button>
        </div>

        {loading && <p className="text-center text-gray-600 mb-4">Loading events...</p>}

        {/* EVENT RESULTS */}
        <div className="space-y-5 mt-6">
          {events.map((ev, i) => (
            <div
              key={i}
              className="border rounded-xl p-5 bg-white shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-gray-900">{ev.title}</h2>
              <p className="text-gray-700 mt-1">{ev.description}</p>

              <div className="flex flex-wrap gap-6 text-gray-600 mt-3 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar size={16} /> {ev.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} /> {ev.venue}
                </span>
                <span className="flex items-center gap-1">
                  <Globe size={16} /> {ev.type}
                </span>
              </div>

              <button
                onClick={() => saveEvent(ev)}
                className="mt-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Plus size={16} />
                Add to My Events
              </button>
            </div>
          ))}

          {!loading && events.length === 0 && (
            <p className="text-center text-gray-500 text-sm">
              No events found. Try different keywords.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
