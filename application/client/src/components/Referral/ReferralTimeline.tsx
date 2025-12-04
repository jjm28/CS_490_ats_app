import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getReferralTimeline,
  addFollowUp,
  addGratitude,
  updateReferralStatus,
} from "../../api/referrals";
import type { TimelineLog } from "../../api/referrals";
import TimelineBadge from "./TimelineBadge";

export default function ReferralTimeline() {
  const { id } = useParams<{ id: string }>();
  const [timeline, setTimeline] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFollowUpBox, setShowFollowUpBox] = useState(false);
  const [showGratitudeBox, setShowGratitudeBox] = useState(false);

  const [followUpMessage, setFollowUpMessage] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  const [gratitudeMessage, setGratitudeMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (id) loadTimeline();
  }, [id]);

  const loadTimeline = async () => {
    setLoading(true);

    try {
      const resp = await getReferralTimeline(id!);
      setTimeline(resp.data.logs || []);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  /* ------------------------------------------
        SUBMIT FOLLOW-UP
  -------------------------------------------*/
  const submitFollowUp = async () => {
    if (!followUpMessage.trim()) return;

    try {
      await addFollowUp(id!, {
        message: followUpMessage,
        nextFollowUp,
      });

      setFollowUpMessage("");
      setNextFollowUp("");
      setShowFollowUpBox(false);
      loadTimeline();
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------------------------------
        SUBMIT GRATITUDE
  -------------------------------------------*/
  const submitGratitude = async () => {
    if (!gratitudeMessage.trim()) return;

    try {
      await addGratitude(id!, { message: gratitudeMessage });
      setGratitudeMessage("");
      setShowGratitudeBox(false);
      loadTimeline();
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------------------------------
        STATUS UPDATES (accepted/declined)
  -------------------------------------------*/
  const updateStatus = async (status: string) => {
    try {
      await updateReferralStatus(id!, status, "");
      loadTimeline();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 underline mb-4"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-4">Referral Timeline</h1>

      {/* BUTTON PANEL */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowFollowUpBox((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Follow-Up
        </button>

        <button
          onClick={() => setShowGratitudeBox((v) => !v)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Gratitude Message
        </button>

        <button
          onClick={() => updateStatus("completed")}
          className="bg-emerald-600 text-white px-4 py-2 rounded"
        >
          Mark as Completed
        </button>

        <button
          onClick={() => updateStatus("declined")}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Mark as Declined
        </button>
      </div>

      {/* FOLLOW-UP BOX */}
      {showFollowUpBox && (
        <div className="border p-4 rounded-lg bg-blue-50 mb-6">
          <h2 className="font-semibold mb-2">Add Follow-up Entry</h2>

          <textarea
            className="w-full border rounded p-2 mb-2"
            placeholder="Follow-up message..."
            value={followUpMessage}
            onChange={(e) => setFollowUpMessage(e.target.value)}
          />

          <label className="block text-sm mb-1">Next follow-up date:</label>
          <input
            type="date"
            className="border rounded p-2 mb-3"
            value={nextFollowUp}
            onChange={(e) => setNextFollowUp(e.target.value)}
          />

          <button
            onClick={submitFollowUp}
            className="bg-blue-600 text-white px-3 py-2 rounded"
          >
            Save Follow-up
          </button>
        </div>
      )}

      {/* GRATITUDE BOX */}
      {showGratitudeBox && (
        <div className="border p-4 rounded-lg bg-green-50 mb-6">
          <h2 className="font-semibold mb-2">Send Gratitude</h2>

          <textarea
            className="w-full border rounded p-2 mb-2"
            placeholder="Thank-you message..."
            value={gratitudeMessage}
            onChange={(e) => setGratitudeMessage(e.target.value)}
          />

          <button
            onClick={submitGratitude}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            Add Gratitude Entry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && <p className="text-gray-500">Loading timeline...</p>}

      {/* Empty state */}
      {!loading && timeline.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          <p>No timeline events yet.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative ml-4 border-l-2 border-gray-200">
        {timeline.map((log) => (
          <div key={log._id} className="mb-8 ml-4">
            <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5"></div>

            <div className="bg-white shadow-md p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-1">
                <TimelineBadge type={log.eventType} />

                <p className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {log.eventDetails}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
