import { useState, useEffect, useMemo } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import InterviewChecklist from "../Interviews/InterviewChecklist";
import {
  initGapi,
  signIn,
  isSignedIn,
  createCalendarEvent,
  checkCalendarConflicts,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../../utils/gcalService";
<<<<<<< HEAD
interface Interview {
  _id?: string;
  type: string;
  date: string;
  locationOrLink?: string;
  notes?: string;
  outcome?: string;
  interviewer?: string;
  contactInfo?: string;
  eventId?: string;
  confidenceLevel?: number;
  anxietyLevel?: number;
}
=======
import type{ Interview, FollowUp } from "../../types/jobs.types";
import FollowUpModal from "../Interviews/FollowUpModal";
import InterviewFollowUp from "../Interviews/InterviewFollowUp";
>>>>>>> feb1cfd748e758a81e16b19852807bb453461d66

async function moveJobToInterviewStage(jobId: string, token: string) {
  try {
    await fetch(`${API_BASE}/api/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "interview" }),
    });
    console.log("✅ Job automatically moved to interview stage");
  } catch (err) {
    console.error("❌ Failed to auto-move job:", err);
  }
}

export default function InterviewScheduler({ jobId }: { jobId: string }) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [form, setForm] = useState<Interview>({
    type: "phone",
    date: "",
    locationOrLink: "",
    notes: "",
    interviewer: "",
    contactInfo: "",
    confidenceLevel: 3,
    anxietyLevel: 3
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gcalReady, setGcalReady] = useState(false);
  const [gcalSignedIn, setGcalSignedIn] = useState(false);
  const [prepTasks, setPrepTasks] = useState<string[]>([]);
  const [followUpModal, setFollowUpModal] = useState<{ jobId: string; interviewId: string; email?: string } | null>(null);

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  /** ✅ Initialize Google API Client safely **/
  useEffect(() => {
    initGapi()
      .then(() => {
        console.log("✅ GAPI initialized");
        setGcalReady(true);
        setGcalSignedIn(isSignedIn());
      })
      .catch((err) => console.error("❌ Failed to init gapi", err));
  }, []);

  /** ✅ Fetch all interviews for this job **/
  const fetchInterviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/interview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      } else {
        console.error("Failed to fetch interviews:", res.status);
      }
    } catch (err) {
      console.error("Error fetching interviews:", err);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [jobId]);

  /** ✅ Google Sign-In **/
  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      setGcalSignedIn(true);
    } catch (err) {
      console.error("Google Sign-In failed:", err);
    }
  };

  /** ✅ Create or Update Interview **/
  const handleSubmit = async () => {
    if (!form.date) {
      alert("Please pick a date and time.");
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API_BASE}/api/jobs/${jobId}/interview/${editingId}`
      : `${API_BASE}/api/jobs/${jobId}/interview`;

    // ✅ Conflict detection
    if (gcalSignedIn && form.date) {
      const startISO = new Date(form.date).toISOString();
      const endISO = new Date(
        new Date(form.date).getTime() + 60 * 60 * 1000
      ).toISOString();

      const hasConflict = await checkCalendarConflicts(startISO, endISO);
      if (hasConflict && !confirm("⚠️ Conflict detected. Continue anyway?"))
        return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        alert("Failed to save interview.");
        console.error("Save failed with status:", res.status);
        return;
      }

      await fetchInterviews();

      await moveJobToInterviewStage(jobId, token);

      const tasks = [
        "Research the company background",
        "Review your resume and projects",
        "Prepare answers to common interview questions",
        "Test your camera/mic (for video interviews)",
        "Have 2-3 questions ready for the interviewer",
      ];
      setPrepTasks(tasks);

      if (gcalSignedIn) {
        if (editingId) {
          const currentInterview = interviews.find((i) => i._id === editingId);
          if (currentInterview && (currentInterview as any).eventId) {
            await updateCalendarEvent((currentInterview as any).eventId, form);
            alert("Interview and calendar event updated ✅");
          } else {
            console.warn(
              "⚠️ No eventId found for this interview, cannot update calendar"
            );
          }
        } else {
          // ✅ Create new calendar event and save its ID
          const calendarEvent = await createCalendarEvent(form);
          if (calendarEvent?.id) {
            // Get the saved interview from backend
            const saved = await res.json();
            // Store eventId into MongoDB
            await fetch(`${API_BASE}/api/jobs/${jobId}/interview/eventId`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                interviewId: saved._id,
                eventId: calendarEvent.id,
              }),
            });
            console.log("✅ Event ID saved to DB:", calendarEvent.id);
          }
          alert("Interview added to Google Calendar ✅");
        }
      }

<<<<<<< HEAD
=======
      // ✅ Reset form
>>>>>>> feb1cfd748e758a81e16b19852807bb453461d66
      setForm({
        type: "phone",
        date: "",
        locationOrLink: "",
        notes: "",
        interviewer: "",
        contactInfo: "",
        confidenceLevel: 3,
        anxietyLevel: 3
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error saving interview:", err);
    }
  };

  /** ✅ Delete Interview **/
  const handleDelete = async (interviewId: string) => {
    if (!confirm("Delete this interview?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        // ✅ Delete from Google Calendar (if signed in)
        if (gcalSignedIn) {
          const interview = interviews.find((i) => i._id === interviewId);
          if (interview?.eventId) {
            await deleteCalendarEvent(interview.eventId);
            console.log("✅ Deleted Google event:", interview.eventId);
          } else {
            console.warn(
              "⚠️ No eventId for this interview — skipping Google Calendar delete"
            );
          }
        }
        await fetchInterviews();
        alert("Interview deleted ✅");
      } else {
        console.error("Failed to delete interview:", res.status);
      }
    } catch (err) {
      console.error("Error deleting interview:", err);
    }
  };

  /** ✅ Update Outcome **/
  const handleOutcomeChange = async (interviewId: string, outcome: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/outcome`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ outcome }),
        }
      );
      if (res.ok) fetchInterviews();
      else console.error("Failed to update outcome:", res.status);
    } catch (err) {
      console.error("Error updating outcome:", err);
    }
  };

  /** ✅ Edit Interview **/
  const handleEdit = (interview: Interview) => {
    setEditingId(interview._id!);
    setForm({
      type: interview.type || "phone",
      date: interview.date
        ? new Date(interview.date).toISOString().slice(0, 16)
        : "",
      locationOrLink: interview.locationOrLink || "",
      notes: interview.notes || "",
      interviewer: interview.interviewer || "",
      contactInfo: interview.contactInfo || "",
      confidenceLevel: interview.confidenceLevel ?? 3,
      anxietyLevel: interview.anxietyLevel ?? 3
    });
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm mt-6">
      <h4 className="text-lg font-semibold mb-4">Schedule Interview</h4>

      {/* ✅ Google Calendar Connection */}
      {gcalReady && (
        <div className="mb-4">
          {gcalSignedIn ? (
            <p className="text-green-700 font-medium">
              ✅ Connected to Google Calendar
            </p>
          ) : (
            <Button variant="secondary" onClick={handleGoogleSignIn}>
              Connect Google Calendar
            </Button>
          )}
        </div>
      )}

      {/* ✅ Interview Form */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium">Type:</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border rounded p-2"
          >
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="in-person">In-person</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Date & Time:</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Location / Link:</label>
          <input
            type="text"
            value={form.locationOrLink}
            onChange={(e) => setForm({ ...form, locationOrLink: e.target.value })}
            className="w-full border rounded p-2"
            placeholder="e.g. Zoom link or office address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Notes:</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border rounded p-2"
            placeholder="Add preparation notes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Interviewer Name:</label>
          <input
            type="text"
            value={form.interviewer || ""}
            onChange={(e) => setForm({ ...form, interviewer: e.target.value })}
            className="w-full border rounded p-2"
            placeholder="e.g. John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Contact Info:</label>
          <input
            type="text"
            value={form.contactInfo || ""}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            className="w-full border rounded p-2"
            placeholder="e.g. john@company.com or phone"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Confidence Level (1–5):</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.confidenceLevel}
            onChange={(e) =>
              setForm({ ...form, confidenceLevel: Number(e.target.value) })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Anxiety Level (1–5):</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.anxietyLevel}
            onChange={(e) =>
              setForm({ ...form, anxietyLevel: Number(e.target.value) })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <Button variant="primary" onClick={handleSubmit}>
          {editingId ? "Update Interview" : "Save Interview"}
        </Button>
      </div>

      {/* ✅ Preparation Checklist
      {prepTasks.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded">
          <h5 className="font-semibold mb-2">Preparation Checklist</h5>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {prepTasks.map((task, idx) => (
              <li key={idx}>{task}</li>
            ))}
          </ul>
        </div>
      )} */}

      {/* ✅ Scheduled Interviews List */}
      {interviews.length > 0 && (
        <div className="mt-6">
          <h5 className="font-semibold mb-2">Scheduled Interviews</h5>
          <ul className="space-y-3">
            {interviews.map((i) => {
              const isPast = new Date(i.date) < new Date();
              return (
                <li
                  key={i._id}
                  className="flex flex-col bg-gray-50 p-4 rounded border"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {i.type} Interview
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(i.date).toLocaleString()}
                      </p>
                      {i.locationOrLink && (
                        <p className="text-sm text-gray-600">{i.locationOrLink}</p>
                      )}
                      {i.interviewer && (
                        <p className="text-sm text-gray-600">
                          Interviewer: {i.interviewer}
                        </p>
                      )}
                      {i.contactInfo && (
                        <p className="text-sm text-gray-600">
                          Contact: {i.contactInfo}
                        </p>
                      )}
                      {i.notes && (
                        <p className="text-xs text-gray-500">{i.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => handleEdit(i)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(i._id!)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* ✅ Outcome Selection for Past Interviews */}
                  {isPast && (
                    <div className="mt-3">
                      <label className="text-sm font-medium mr-2">
                        Outcome:
                      </label>
                      <select
                        value={i.outcome || ""}
                        onChange={(e) =>
                          handleOutcomeChange(i._id!, e.target.value)
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select outcome</option>
                        <option value="passed">Passed</option>
                        <option value="rejected">Rejected</option>
                        <option value="pending">Awaiting feedback</option>
                      </select>
                    </div>
                  )}
                  
                  {isPast && i.outcome && (
                    <InterviewFollowUp
                      jobId={jobId}
                      interviewId={i._id!}
                      interviewerEmail={i.contactInfo}
                      interviewDate={i.date}
                      existingFollowUps={i.followUps || []}
                      onFollowUpUpdate={fetchInterviews}
                      compact={false}
                    />
                  )}

                  {/* Modal */}
                  {followUpModal && (
                    <FollowUpModal
                      jobId={followUpModal.jobId}
                      interviewId={followUpModal.interviewId}
                      interviewerEmail={followUpModal.email}
                      onClose={() => setFollowUpModal(null)}
                      onSuccess={fetchInterviews}
                    />
                  )}

                  {!isPast && (
                    <InterviewChecklist
                      jobId={jobId}
                      interviewId={i._id!}
                      checklist={i.preparationChecklist}
                      onChecklistUpdate={fetchInterviews}
                      compact={false}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
