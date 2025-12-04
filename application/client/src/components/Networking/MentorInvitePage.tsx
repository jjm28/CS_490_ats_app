import { useState } from "react";
import API_BASE from "../../utils/apiBase";
import { useNavigate } from "react-router-dom";

export default function MentorInvitePage() {
  const navigate = useNavigate();
  const [mentorEmail, setEmail] = useState("");
  const [mentorName, setName] = useState("");

  const [permissions, setPermissions] = useState({
    resume: true,
    applications: true,
    analytics: false,
    interviewPrep: true,
  });

  function authHeaders() {
    const raw = localStorage.getItem("authUser");
    const token = raw ? JSON.parse(raw).token : null;
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

async function sendInvite() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;
    console.log("Sending invite:", {
  email: mentorEmail,
  name: mentorName,
  permissions
});

  const res = await fetch(`${API_BASE}/api/mentors/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // ⭐ REQUIRED
    },
body: JSON.stringify({
  email: mentorEmail,
  name: mentorName,
  permissions: {
    shareProfile: permissions.resume,
    shareApplications: permissions.applications,
    shareAnalytics: permissions.analytics,
    shareInterviewPrep: permissions.interviewPrep
  }
}),

  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Invite failed:", data);
    alert(`Error: ${data.error || "Failed to send invite"}`);
    return;
  }

  //alert("Invite sent successfully!");
  navigate("/networking/mentors");
}


  return (
    <div className="max-w-lg mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-4">
        Invite a Mentor / Career Coach
      </h1>

      {/* Email */}
      <label className="block font-semibold mb-1">Mentor Email</label>
      <input
        className="border p-2 rounded w-full mb-4"
        placeholder="example@someone.com"
        value={mentorEmail}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* Name */}
      <label className="block font-semibold mb-1">Mentor Name</label>
      <input
        className="border p-2 rounded w-full mb-4"
        placeholder="Optional"
        value={mentorName}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Permissions */}
      <h2 className="font-semibold mt-6 mb-2">What can they access?</h2>

      {Object.keys(permissions).map((key) => (
        <label key={key} className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={(permissions as any)[key]}
            onChange={(e) =>
              setPermissions({ ...permissions, [key]: e.target.checked })
            }
          />
          {key.replace(/([A-Z])/g, " $1")}
        </label>
      ))}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded shadow mt-6"
        onClick={sendInvite}
      >
        Send Invite
      </button>
    </div>
  );
}
