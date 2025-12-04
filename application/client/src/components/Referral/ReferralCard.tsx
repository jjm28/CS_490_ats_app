import { useNavigate } from "react-router-dom";
import ReferralStatusBadge from "./ReferralStatusBadge";
import type { Referral } from "../../api/referrals";
import axios from "axios";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function ReferralCard({
  referral,
  reload,
}: {
  referral: Referral;
  reload: () => void;
}) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  // Safe fallbacks
  const strength: number = referral.relationshipStrength ?? 50;
  const successRate: number = referral.successRate ?? 0;

  // Color logic for bars
  const strengthColor =
    strength > 70 ? "#16a34a" : strength > 40 ? "#f59e0b" : "#ef4444";

  const successColor =
    successRate > 70 ? "#16a34a" : successRate > 40 ? "#f59e0b" : "#ef4444";

  const deleteReferral = async () => {
    if (!window.confirm("Are you sure you want to delete this referral?")) return;

    try {
      setDeleting(true);
      const raw = localStorage.getItem("authUser");
      const token = raw ? JSON.parse(raw).token : null;

      await axios.delete(`/api/referrals/${referral._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      reload();
    } catch (error) {
      console.error("❌ Delete failed:", error);
      alert("Failed to delete referral");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border hover:border-blue-400 transition">

      {/* HEADER ROW */}
      <div className="flex justify-between items-center">

        {/* LEFT: Referrer Name */}
        <h2 className="text-lg font-semibold">{referral.referrerName}</h2>

        {/* RIGHT: Status + Delete */}
        <div className="flex items-center gap-2">
          <ReferralStatusBadge status={referral.status} />

          {/* DELETE BUTTON */}
          <button
            onClick={deleteReferral}
            disabled={deleting}
            className="p-1 hover:bg-red-100 rounded-full transition"
            title="Delete referral"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* JOB */}
      <p className="text-sm text-gray-500">
        Job: {referral.jobId?.jobTitle || "Unknown Job"}
      </p>

      {/* DATE REQUESTED */}
      <p className="text-sm mt-2">
        Requested on: {new Date(referral.dateRequested).toLocaleDateString()}
      </p>

      {/* NEXT FOLLOW-UP */}
      {referral.nextFollowUp && (
        <p className="text-xs text-blue-600 mt-1">
          Next follow-up: {new Date(referral.nextFollowUp).toLocaleDateString()}
        </p>
      )}

      {/* RELATIONSHIP STRENGTH BAR */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Relationship Strength</span>
          <span className="font-semibold">{strength}/100</span>
        </div>

        <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
          <div
            className="h-2 rounded"
            style={{
              width: `${strength}%`,
              backgroundColor: strengthColor,
            }}
          ></div>
        </div>
      </div>

      {/* SUCCESS PROBABILITY BAR */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Success Probability</span>
          <span className="font-semibold">{successRate}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
          <div
            className="h-2 rounded"
            style={{
              width: `${successRate}%`,
              backgroundColor: successColor,
            }}
          ></div>
        </div>
      </div>

      {/* TIMELINE BUTTON */}
      <button
        onClick={() => navigate(`/referrals/timeline/${referral._id}`)}
        className="mt-5 w-full text-sm bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        View Timeline
      </button>
    </div>
  );
}
