import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Trash2, Save, Plus, Users } from "lucide-react";

import AddFollowUpModal from "./AddFollowUpModal";
import AddConnectionModal from "./AddConnectionModal";
import EditConnectionModal from "./EditConnectionModal";
import EditFollowUpModal from "./EditFollowUpModal";
import LinkJobModal from "./LinkJobModal";

interface LinkedJob {
  _id: string;
  title: string;
  company: string;
  status: string;
}



export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // MODALS
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);




  /* ---------------------------------------------
      Load Event
  ---------------------------------------------- */
  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await axios.get(`/api/networking/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEvent(res.data);
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  /* ---------------------------------------------
      Update Event
  ---------------------------------------------- */
  const updateEvent = async () => {
    try {
      const token = localStorage.getItem("authToken");

      await axios.put(
        `/api/networking/events/${eventId}`,
        {
          ...event,
          goals: event.goals?.map((g: string) => g.trim()),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditMode(false);
      fetchEvent();
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event.");
    }
  };

  /* ---------------------------------------------
      Delete Event
  ---------------------------------------------- */
  const deleteEvent = async () => {
    if (!confirm("Delete this event?")) return;

    try {
      const token = localStorage.getItem("authToken");

      await axios.delete(`/api/networking/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/networking/events");
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  /* ---------------------------------------------
      Follow-Up Completion
  ---------------------------------------------- */
  const completeFollowup = async (index: number, fu: any) => {
    try {
      const token = localStorage.getItem("authToken");

      await axios.put(
        `/api/networking/events/${eventId}/followups/${index}`,
        { ...fu, completed: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchEvent();
    } catch (err) {
      console.error("Complete follow-up error:", err);
    }
  };

  const deleteFollowup = async (index: number) => {
    try {
      const token = localStorage.getItem("authToken");

      await axios.delete(
        `/api/networking/events/${eventId}/followups/${index}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchEvent();
    } catch (err) {
      console.error("Delete follow-up error:", err);
    }
  };

  // DELETE a connection
const handleDeleteConnection = async (connectionId: string) => {
  if (!confirm("Delete this connection?")) return;

  try {
    const token = localStorage.getItem("authToken");

    await axios.delete(
      `/api/networking/events/${eventId}/connections/${connectionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchEvent();
  } catch (err) {
    console.error("Delete connection error:", err);
    alert("Failed to delete connection.");
  }
};

// EDIT a connection
const handleEditConnection = (connection: any) => {
  setEditingConnection(connection);
};

const generatePrep = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const res = await axios.post(
      `/api/networking/events/${eventId}/prep`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setEvent({ ...event, prep: res.data });

  } catch (err) {
    console.error("Prep generation error:", err);
    alert("Failed to generate event preparation.");
  }
};

const saveNotes = async () => {
  try {
    const token = localStorage.getItem("authToken");

    await axios.put(
      `/api/networking/events/${eventId}`,
      { prep: event.prep },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    console.error("Notes save error:", err);
  }
};

const generateROI = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const roiRes = await axios.get(
      `/api/networking/events/${eventId}/roi`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("ROI Score: " + roiRes.data.roi);
    fetchEvent();
  } catch (err) {
    console.error("ROI error:", err);
    alert("Failed to compute ROI.");
  }
};



  if (loading) return <p className="p-6">Loading...</p>;
  if (!event) return <p className="p-6 text-red-500">Event not found.</p>;

return (
  <div className="max-w-5xl mx-auto p-6 space-y-8">

    {/* BACK BUTTON */}
    <div className="flex items-center justify-between">
      <button
        onClick={() => navigate("/networking/events")}
        className="flex items-center gap-2 text-gray-700 hover:text-black"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <button
        onClick={() => setShowLinkModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
      >
        + Link Job Application
      </button>
    </div>

    {/* HEADER CARD */}
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-start">
        {/* Title */}
        <div>
          {editMode ? (
            <input
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              className="border p-2 rounded w-full text-xl font-semibold"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          )}

          <p className="text-gray-600 mt-1">
            {event.industry || "No industry"} • {event.location || "No location"}
          </p>
        </div>

        {/* Edit/Delete */}
        <div className="flex gap-2">
          {editMode ? (
            <button
              onClick={updateEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Save size={18} /> Save
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Edit
            </button>
          )}

          <button
            onClick={deleteEvent}
            className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      {/* Inline Tags */}
      <div className="flex gap-3 mt-4">
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
            event.type === "virtual"
              ? "bg-purple-100 text-purple-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {event.type}
        </span>

        <span
          className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
            event.attendanceStatus === "planning"
              ? "bg-yellow-100 text-yellow-700"
              : event.attendanceStatus === "attended"
              ? "bg-blue-100 text-blue-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {event.attendanceStatus}
        </span>
      </div>
    </div>

    {/* MAIN 2-COLUMN LAYOUT */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* LEFT COLUMN — DETAILS */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Event Details</h2>

        <DetailField
          label="Date"
          type="date"
          value={event.date ? event.date.substring(0, 10) : ""}
          displayValue={
            event.date ? new Date(event.date).toLocaleDateString() : "N/A"
          }
          editable={editMode}
          onChange={(v) => setEvent({ ...event, date: v })}
        />

        <DetailField
          label="Goals"
          value={event.goals?.join(", ") || ""}
          displayValue={
            <ul className="list-disc pl-5 text-gray-700">
              {event.goals?.length
                ? event.goals.map((g: string, i: number) => <li key={i}>{g}</li>)
                : "No goals listed."}
            </ul>
          }
          editable={editMode}
          onChange={(v) =>
            setEvent({
              ...event,
              goals: v.split(",").map((g: string) => g.trim()),
            })
          }
        />

        <DetailSelect
          label="Type"
          value={event.type}
          editable={editMode}
          onChange={(v) => setEvent({ ...event, type: v })}
          options={[
            { value: "in-person", label: "In-Person" },
            { value: "virtual", label: "Virtual" },
          ]}
        />

        <DetailSelect
          label="Attendance"
          value={event.attendanceStatus}
          editable={editMode}
          onChange={(v) => setEvent({ ...event, attendanceStatus: v })}
          options={[
            { value: "planning", label: "Planning" },
            { value: "attended", label: "Attended" },
            { value: "missed", label: "Missed" },
          ]}
        />
      </div>

      {/* RIGHT COLUMN — ROI + JOB LINKS */}
      <div className="space-y-6">
        {/* ROI */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">ROI Score</h2>
          <p className="text-3xl font-bold text-purple-600">
            {event.roiScore ?? "Not calculated"}
          </p>

          <button
            onClick={generateROI}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Recalculate ROI
          </button>
        </div>

        {/* Linked Jobs */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Linked Job Applications</h2>

          {!event.linkedJobs?.length ? (
            <p className="text-gray-500 italic">No linked jobs yet.</p>
          ) : (
            <div className="space-y-3">
              {event.linkedJobs.map((job: LinkedJob) => (
                <div key={job._id} className="p-3 border rounded-lg shadow-sm">
                  <div className="font-semibold text-lg">
                    {job.title} @ {job.company}
                  </div>
                  <div className="text-sm text-gray-600">Status: {job.status}</div>
                  <button
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="mt-2 text-blue-600 underline"
                  >
                    View Job
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* CONNECTIONS */}
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={18} /> Connections Made
        </h2>

        <button
          onClick={() => setShowConnectionModal(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          + Add Connection
        </button>
      </div>

      {!event.connections?.length ? (
        <p className="text-gray-500 italic">No connections recorded.</p>
      ) : (
        <ul className="space-y-3">
          {event.connections.map((c: any) => (
            <li
              key={c._id}
              className="p-4 border rounded-lg bg-gray-50 flex justify-between items-start"
            >
              <div>
                <p className="font-medium text-gray-800">{c.name}</p>
                {c.company && <p className="text-sm text-gray-600">{c.company}</p>}
                {c.role && <p className="text-sm text-gray-600">{c.role}</p>}
                {c.email && <p className="text-sm text-gray-600">{c.email}</p>}
                {c.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">{c.notes}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditConnection(c)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteConnection(c._id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* FOLLOW-UP TASKS */}
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Follow-Up Tasks</h2>

        <button
          onClick={() => setShowFollowUpModal(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          + Add Follow-Up
        </button>
      </div>

      {!event.followUps?.length ? (
        <p className="text-gray-500 italic">No follow-ups yet.</p>
      ) : (
        <ul className="space-y-3">
          {event.followUps.map((fu: any, index: number) => (
            <li
              key={index}
              className="p-3 bg-gray-50 rounded border flex justify-between items-start"
            >
              <div>
                <p className="font-medium">
                  {fu.completed ? (
                    <span className="text-green-600">✔ Completed</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Pending</span>
                  )}
                </p>
                <p className="text-gray-800">{fu.note}</p>
                <p className="text-sm text-gray-500">
                  Due: {new Date(fu.date).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFollowUp({ index, fu })}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>

                {!fu.completed && (
                  <button
                    onClick={() => completeFollowup(index, fu)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Complete
                  </button>
                )}

                <button
                  onClick={() => deleteFollowup(index)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* PREP */}
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">Pre-Event Preparation</h2>

        <button
          onClick={generatePrep}
          className="bg-purple-600 text-white px-3 py-2 rounded"
        >
          Generate Prep
        </button>
      </div>

      {!event.prep?.summary ? (
        <p className="text-gray-500 italic">No prep generated yet.</p>
      ) : (
        <div className="space-y-6">
          <Section title="Summary">{event.prep.summary}</Section>

          <Section title="Key People">
            <ul className="list-disc pl-6 space-y-1">
              {event.prep.keyPeople.map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Section>

          <Section title="Suggested Questions">
            <ul className="list-disc pl-6 space-y-1">
              {event.prep.suggestedQuestions.map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Section>

          <Section title="Preparation Tasks">
            <ul className="list-disc pl-6 space-y-1">
              {event.prep.prepTasks.map((t: string, i: number) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Section>

          <Section title="Your Notes">
            <textarea
              className="border p-2 rounded w-full h-28"
              value={event.prep.notes || ""}
              onChange={(e) =>
                setEvent({ ...event, prep: { ...event.prep, notes: e.target.value } })
              }
              onBlur={saveNotes}
            />
          </Section>
        </div>
      )}
    </div>

    {/* MODALS */}
    {showFollowUpModal && (
      <AddFollowUpModal
        eventId={eventId!}
        onClose={() => setShowFollowUpModal(false)}
        refresh={fetchEvent}
      />
    )}

    {showConnectionModal && (
      <AddConnectionModal
        eventId={eventId!}
        onClose={() => setShowConnectionModal(false)}
        refresh={fetchEvent}
      />
    )}

    {editingConnection && (
      <EditConnectionModal
        eventId={eventId!}
        connection={editingConnection}
        onClose={() => setEditingConnection(null)}
        refresh={fetchEvent}
      />
    )}

    {editingFollowUp && (
      <EditFollowUpModal
        eventId={eventId!}
        index={editingFollowUp.index}
        followUp={editingFollowUp.fu}
        onClose={() => setEditingFollowUp(null)}
        refresh={fetchEvent}
      />
    )}

    {showLinkModal && (
      <LinkJobModal
        eventId={event._id}
        onClose={() => setShowLinkModal(false)}
        onLinked={(updated) => setEvent(updated)}
      />
    )}
  </div>
);

}

/* ------------------------------------------
   Helper Components
------------------------------------------- */

interface DetailFieldProps {
  label: string;
  value: any;
  displayValue?: any;
  editable: boolean;
  onChange: (v: any) => void;
  type?: string;
}

function DetailField({
  label,
  value,
  displayValue,
  editable,
  onChange,
  type = "text",
}: DetailFieldProps) {
  return (
    <div>
      <label className="font-semibold">{label}:</label>

      {editable ? (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="border p-2 rounded w-full"
        />
      ) : (
        <div className="text-gray-700">{displayValue || value || "N/A"}</div>
      )}
    </div>
  );
}

interface DetailSelectOption {
  value: string;
  label: string;
}

interface DetailSelectProps {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  options: DetailSelectOption[];
}

function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}


function DetailSelect({
  label,
  value,
  editable,
  onChange,
  options,
}: DetailSelectProps) {
  return (
    <div>
      <label className="font-semibold">{label}:</label>

      {editable ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-gray-700 capitalize">{value}</div>
      )}
    </div>
  );
}
