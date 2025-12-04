import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

interface Recommendation {
  _id: string;
  text: string;
  implemented: boolean;
}

interface Permissions {
  shareProfile: boolean;
  shareApplications: boolean;
  shareAnalytics: boolean;
}

interface Mentor {
  _id: string;
  mentorEmail: string;
  mentorName: string;
  status: string;
  permissions: Permissions;
  recommendations?: Recommendation[];
}

interface ChatMessage {
  _id: string;
  sender: string;
  message: string;
  createdAt: string;
}


export default function MentorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [newRec, setNewRec] = useState("");
  
const [chatOpen, setChatOpen] = useState(false);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [newMessage, setNewMessage] = useState("");


  async function load() {
    const res = await fetch(`${API_BASE}/api/mentors/${id}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    setMentor(data);
  }

 useEffect(() => {
  load();
  loadChat();
}, [id]);


  // Safe fallback to avoid crash
  const recs = mentor?.recommendations ?? [];
  const pendingRecs = recs.filter((r) => !r.implemented);
  const doneRecs = recs.filter((r) => r.implemented);

  async function addRecommendation() {
    if (!newRec.trim()) return;

    const res = await fetch(`${API_BASE}/api/mentors/${id}/recommendations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: newRec }),
    });

    const data = await res.json();
    setMentor((prev) =>
      prev
        ? { ...prev, recommendations: [...(prev.recommendations ?? []), data] }
        : prev
    );

    setNewRec("");
  }

  async function sendMessage() {
  if (!newMessage.trim()) return;

  const res = await fetch(`${API_BASE}/api/mentors/${id}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message: newMessage, sender: "user" }),
  });

  const data = await res.json();
  setMessages(prev => [...prev, data]);
  setNewMessage("");
}


  async function toggleRecommendation(recId: string, implemented: boolean) {
    await fetch(`${API_BASE}/api/mentors/${id}/recommendations/${recId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ implemented }),
    });

    setMentor((prev) =>
      prev
        ? {
            ...prev,
            recommendations: (prev.recommendations ?? []).map((r) =>
              r._id === recId ? { ...r, implemented } : r
            ),
          }
        : prev
    );
  }

async function deleteRecommendation(recId: string) {
  if (!id) return;

  const res = await fetch(
    `${API_BASE}/api/mentors/${id}/recommendations/${recId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Delete failed", err, res.status);
    alert("Failed to delete recommendation.");
    return;
  }

  // Reload from DB after success
  await load();
}


async function loadChat() {
  const res = await fetch(`${API_BASE}/api/mentors/${id}/messages`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  setMessages(data);
}
async function exportReport() {
  try {
    const res = await fetch(`${API_BASE}/api/mentors/${id}/export`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (!res.ok) {
      alert("Failed to download report");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `mentor-progress-${id}.pdf`;
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed", err);
    alert("Something went wrong exporting report");
  }
}

  if (!mentor)
    return <p className="text-center mt-10 text-gray-500">Loading mentor...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        className="text-blue-600 font-medium mb-6 hover:underline"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* Mentor Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow border mb-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mentor.mentorName || "Mentor"}
        </h1>
        <p className="text-gray-600">{mentor.mentorEmail}</p>

        <span
          className={`inline-block mt-3 px-3 py-1 text-xs rounded-full font-semibold ${
            mentor.status === "accepted"
              ? "bg-green-100 text-green-600"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {mentor.status === "accepted" ? "Active Mentor" : "Pending Invite"}
        </span>

        {/* Permissions */}
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {Object.entries(mentor.permissions)
            .filter(([_, v]) => v)
            .map(([key]) => (
              <span
                key={key}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize"
              >
                {key.replace("share", "")}
              </span>
            ))}
        </div>
      </div>

      {/* 🔥 Progress Tracking Section */}
{mentor.recommendations && mentor.recommendations.length > 0 && (
  <div className="bg-white border rounded-xl p-5 shadow mb-10">

    {/* Progress Header */}
    <h2 className="text-lg font-semibold mb-3 text-gray-900">
      Progress Overview
    </h2>

    {/* Math */}
    {(() => {
      const total = mentor.recommendations!.length;
      const done = mentor.recommendations!.filter(r => r.implemented).length;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;

      let message = "Let’s begin — add your first milestone!";
      if (percent > 0 && percent < 50) message = "You're making progress — keep pushing! 💪";
      if (percent >= 50 && percent < 100) message = "Strong momentum — almost there! 🚀";
      if (percent === 100) message = "🎉 You’ve completed all career recommendations!";

      return (
        <>
          {/* Stats */}
          <p className="text-sm font-medium text-gray-700 mb-2">
            {done}/{total} Completed ({percent}%)
          </p>

          {/* Colorful Animated Progress Bar */}
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-3">
            <div
              className="h-3 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background:
                  percent === 100
                    ? "linear-gradient(to right, #34d399, #10b981)" // green win
                    : "linear-gradient(to right, #2563eb, #3b82f6)", // fresh blue
              }}
            ></div>
          </div>

          {/* Accountability Message */}
          <p className="text-sm text-gray-600 italic">
            {message}
          </p>
        </>
      );
    })()}
  </div>
)}


      {/* Recommendation Section */}
      <h2 className="text-lg font-semibold mb-2 flex items-center justify-between">
  Career Recommendations
  <button
    onClick={exportReport}
    className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
  >
    📄 Export Report
  </button>
</h2>

{/* Add Recommendation */}
<div className="flex gap-2 mb-6 bg-white p-3 rounded-xl shadow-sm border">
  <input
    type="text"
    className="border p-2 rounded-lg flex-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
    placeholder="Add a suggestion for growth..."
    value={newRec}
    onChange={(e) => setNewRec(e.target.value)}
  />
  <button
    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
    onClick={addRecommendation}
  >
    Add
  </button>
</div>


{/* Pending */}
{pendingRecs.length > 0 && (
  <>
    <h3 className="font-medium mb-2 text-gray-800">To Work On</h3>

    <div className="space-y-3 mb-6">
      {pendingRecs.map((rec) => (
        <div
          key={rec._id}
          className="bg-gray-50 border rounded-xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-100 transition"
        >
          <span className="text-sm text-gray-700 font-medium">{rec.text}</span>

          <div className="flex gap-2">
            <button
              onClick={() => toggleRecommendation(rec._id, true)}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              ✓ Done
            </button>
            <button
              className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              onClick={() => deleteRecommendation(rec._id)}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  </>
)}


{/* Completed */}
{doneRecs.length > 0 && (
  <>
    <h3 className="font-medium mb-2 text-gray-800">Completed</h3>

    <div className="space-y-3">
      {doneRecs.map((rec) => (
        <div
          key={rec._id}
          className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between opacity-80"
        >
          <span className="text-sm line-through text-gray-400">
            {rec.text}
          </span>

          <button
            onClick={() => toggleRecommendation(rec._id, false)}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Undo
          </button>
        </div>
      ))}
    </div>
  </>
)}


      {/* Empty State */}
      {recs.length === 0 && (
        <p className="text-center text-gray-500 italic mt-6">
          No recommendations yet — add one to get started!
        </p>
      )}

      {/* CHAT BUBBLE TOGGLE BUTTON */}
<div className="fixed bottom-6 right-6">
  <button
    onClick={() => {
      setChatOpen(!chatOpen);
      if (!chatOpen) loadChat();
    }}
    className="bg-blue-600 text-white rounded-full w-14 h-14 shadow-lg text-2xl hover:bg-blue-700"
  >
    💬
  </button>
</div>

{/* CHAT PANEL */}
{chatOpen && (
  <div className="fixed bottom-24 right-6 w-80 bg-white shadow-xl rounded-xl border flex flex-col">
    <div className="p-3 border-b font-semibold text-gray-700">
      Chat with {mentor.mentorName || "Mentor"}
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.map(msg => (
        <div
          key={msg._id}
          className={`p-2 rounded-lg text-sm max-w-[80%] ${
            msg.sender === "user"
              ? "bg-blue-600 text-white self-end ml-auto"
              : "bg-gray-200 text-black self-start mr-auto"
          }`}
        >
          {msg.message}
        </div>
      ))}
    </div>

    {/* Input */}
    <div className="flex border-t p-2 gap-2">
      <input
        className="flex-1 border rounded px-2 text-sm"
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
      />
      <button
        onClick={sendMessage}
        className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  </div>
)}

    </div>
  );
}
