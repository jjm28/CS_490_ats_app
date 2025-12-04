import { useEffect, useState } from "react";
import {
  getReferralTimeline,
  addFollowUp,
  addGratitude,
  type TimelineLog
} from "../../api/referrals";

import type { Referral } from "../../api/referrals";

interface ReferralTimelineModalProps {
  referral: Referral;
  onClose: () => void;
}

export default function ReferralTimelineModal({
  referral,
  onClose,
}: ReferralTimelineModalProps) {
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up state
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  // Gratitude state
  const [gratitudeMessage, setGratitudeMessage] = useState("");

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      const resp = await getReferralTimeline(referral._id);
      setLogs(resp.data.logs || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const submitFollowUp = async () => {
    await addFollowUp(referral._id, {
      message: followUpMessage,
      nextFollowUp,
    });

    setFollowUpMessage("");
    setNextFollowUp("");
    loadTimeline();
  };

  const submitGratitude = async () => {
    await addGratitude(referral._id, {
      message: gratitudeMessage,
    });

    setGratitudeMessage("");
    loadTimeline();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Referral Timeline — {referral.referrerName}
        </h2>

        {/* TIMELINE */}
        {loading ? (
          <p>Loading timeline...</p>
        ) : (
          <div className="max-h-80 overflow-y-auto border rounded p-3 mb-4">
            {logs.length === 0 && (
              <p className="text-gray-500 text-center">No history yet.</p>
            )}

            {logs.map((log) => (
              <div key={log._id} className="border-b py-2">
                <p className="font-semibold capitalize">{log.eventType}</p>
                <p className="text-sm text-gray-600">{log.eventDetails}</p>
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* FOLLOW UP */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Add Follow-Up</h3>
          <textarea
            className="w-full border p-2 rounded mb-2"
            placeholder="Follow-up message..."
            value={followUpMessage}
            onChange={(e) => setFollowUpMessage(e.target.value)}
          />
          <input
            type="date"
            className="w-full border p-2 rounded mb-2"
            value={nextFollowUp}
            onChange={(e) => setNextFollowUp(e.target.value)}
          />
          <button
            onClick={submitFollowUp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Add Follow-Up
          </button>
        </div>

        {/* GRATITUDE */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Send Gratitude</h3>
          <textarea
            className="w-full border p-2 rounded mb-2"
            placeholder="Thank you message..."
            value={gratitudeMessage}
            onChange={(e) => setGratitudeMessage(e.target.value)}
          />
          <button
            onClick={submitGratitude}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
          >
            Send Gratitude
          </button>
        </div>

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="mt-3 w-full text-gray-600 underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}
