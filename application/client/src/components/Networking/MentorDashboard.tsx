import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import { FiUserCheck, FiUsers } from "react-icons/fi";
import { MdOutlineSupportAgent } from "react-icons/md";

function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

interface Recommendation {
  text: string;
  implemented: boolean;
}

interface Mentor {
  _id: string;
  mentorEmail: string;
  relationship: string;
  accepted: boolean;
  permissions: {
    shareProfile: boolean;
    shareApplications: boolean;
    shareAnalytics: boolean;
  };
  recommendations?: Recommendation[];
}

export default function MentorDashboard() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/mentors/my`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setMentors(data);
    } catch {
      setMentors([]);
    }
    setLoading(false);
  }

  async function deleteMentor(id: string) {
  if (!confirm("Remove this mentor?")) return;
     setIsDeleting(true);
  const res = await fetch(`${API_BASE}/api/mentors/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (res.ok) {
        await load();
    setIsDeleting(false);
  }  else {
    setIsDeleting(false); // restore if fails
    alert("Failed to delete mentor");
  }
}


  useEffect(() => {
    load();
  }, []);

  if (isDeleting) {
  return <p className="text-center mt-10 text-gray-500">Removing mentor...</p>;
}
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
                    {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-6 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
      >
        ← Back to Network Dashboard
      </button>
      {/* HEADER ------------------------------------------------*/}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MdOutlineSupportAgent className="text-blue-600" />
          Mentorship & Coaching
        </h1>
      </div>

      {/* INVITE MENTOR CTA CARD --------------------------------*/}
      <div className="mb-10 flex justify-center">
        <div
          onClick={() => navigate("/networking/mentors/invite")}
          className="cursor-pointer group w-full md:w-3/4 lg:w-1/2 px-6 py-6 bg-gradient-to-br from-purple-600 to-blue-600 
                     text-white rounded-2xl shadow-lg text-center hover:scale-[1.02] transition transform"
        >
          <div className="text-4xl mb-2 group-hover:rotate-6 transition">
            🌟
          </div>
          <h3 className="text-xl font-semibold mb-1">
            Invite a Mentor or Career Coach
          </h3>
          <p className="text-sm text-purple-100">
            Share your progress and receive guided support.
          </p>
        </div>
      </div>

      {/* MENTOR LIST -------------------------------------------*/}
      {loading ? (
        <p className="text-gray-600">Loading mentorships…</p>
      ) : mentors.length === 0 ? (
        <p className="text-gray-600 italic text-center">
          You have not invited any mentors yet.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((m) => {
            const total = m.recommendations?.length ?? 0;
            const done =
              m.recommendations?.filter((r) => r.implemented).length ?? 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div
                key={m._id}
                onClick={() => navigate(`/networking/mentors/${m._id}`)}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-xl cursor-pointer border transition"
              >
                {/* Mentor Name */}
                <h3 className="text-lg font-semibold text-gray-900">
                  {m.mentorEmail}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{m.relationship}</p>

                {/* Status */}
                <div className="mb-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      m.accepted
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {m.accepted ? (
                      <span className="flex items-center gap-1">
                        <FiUserCheck /> Accepted
                      </span>
                    ) : (
                      "Pending"
                    )}
                  </span>
                </div>

                    <button
                    className="text-red-600 text-xs underline mt-2"
                    onClick={(e) => {
                        e.stopPropagation(); // ⛔ stop card navigation!
                        deleteMentor(m._id);
                    }}
                    >
                    Remove
                    </button>



                {/* Permissions */}
                <p className="text-xs font-semibold mb-1 text-gray-700">
                  Shared Access:
                </p>
                <ul className="text-xs text-gray-500 space-y-1 mb-3">
                  {m.permissions.shareProfile && <li>• Profile</li>}
                  {m.permissions.shareApplications && <li>• Applications</li>}
                  {m.permissions.shareAnalytics && <li>• Analytics</li>}
                </ul>

                {/* Progress Bar if recs exist */}
                {total > 0 && (
                  <>
                    <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-blue-600 h-2 rounded-full transition-all"
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {done}/{total} Recommendations Completed
                    </p>

                    {/* Checklist preview (last 2 items) */}
                    <ul className="text-xs text-gray-500 italic">
                      {m.recommendations!.slice(-2).map((rec, idx) => (
                        <li key={idx}>
                          {rec.implemented ? "✓ " : "• "} {rec.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
