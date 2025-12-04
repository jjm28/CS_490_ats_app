import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

/* ---------------------------------------------------------
   TYPE DEFINITIONS
--------------------------------------------------------- */
interface ContactDetails {
  _id: string;
  name: string;
  title?: string;
  company?: string;
}

interface InformationalInterview {
  _id: string;
  contactId?: ContactDetails;
  industry?: string;
  role?: string;
  scheduledDate?: string;
  completed?: boolean;
}

/* Auth Header */
function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

/* ---------------------------------------------------------
   STATUS BADGE
--------------------------------------------------------- */
function StatusBadge({ date, completed }: { date?: string; completed?: boolean }) {
  if (completed) {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
        Completed
      </span>
    );
  }

  if (!date) {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded">
        Unscheduled
      </span>
    );
  }

  const isUpcoming = new Date(date) >= new Date();
  return (
    <span
      className={`px-2 py-0.5 text-xs font-semibold rounded ${
        isUpcoming
          ? "bg-blue-100 text-blue-700"
          : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {isUpcoming ? "Upcoming" : "Past"}
    </span>
  );
}

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function InformationalInterviews() {
  const [interviews, setInterviews] = useState<InformationalInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/informational`, {
          headers: authHeaders(),
        });

        const data = await res.json();
        setInterviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load informational interviews:", err);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sortedInterviews = useMemo(() => {
    return interviews.sort((a, b) => {
      const dA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const dB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return dA - dB;
    });
  }, [interviews]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
                     {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-6 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
      >
        ← Back to Network Dashboard
      </button>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Informational Interviews
        </h1>

        <Link
          to="/networking/informational/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg shadow hover:bg-purple-700 transition"
        >
          + Request Interview
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center">Loading…</p>
      ) : interviews.length === 0 ? (
        <div className="text-center text-gray-500 italic">
          No informational interviews yet — start networking!
        </div>
      ) : (
        <div className="space-y-4">
          {sortedInterviews.map((iv) => (
            <Link
              key={iv._id}
              to={`/networking/informational/${iv._id}`}
              className="block p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition cursor-pointer"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {iv.contactId?.name ?? "Unknown Contact"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {(iv.contactId?.title || "Role") +
                      " @ " +
                      (iv.contactId?.company || "Company")}
                  </p>
                </div>

                <StatusBadge
                  date={iv.scheduledDate}
                  completed={iv.completed}
                />
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <p>
                  {iv.scheduledDate
                    ? `Scheduled: ${new Date(iv.scheduledDate).toLocaleDateString()}`
                    : "No date set"}
                </p>
                <p>{iv.industry ?? "Industry unspecified"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
