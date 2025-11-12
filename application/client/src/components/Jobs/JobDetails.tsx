import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import API_BASE from "../../utils/apiBase";
import { getCompanyInfo } from "../../api/company";
import {
  type Job,
  STATUS_DISPLAY,
  STATUS_VALUE,
} from "../../types/jobs.types";

// ✅ Add this new interface
export interface JobDetailProps {
  jobId?: string;
  onClose?: () => void;
}

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

export default function JobDetails({
  jobId: propJobId,
  onClose,
  onUpdate,
}: JobDetailProps & { onUpdate?: () => void }) {

  const { id: routeJobId } = useParams<{ id: string }>();
  const jobId = propJobId || routeJobId;
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [newHistoryEntry, setNewHistoryEntry] = useState("");
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(
    null
  );
  const [editingHistoryText, setEditingHistoryText] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`${JOBS_ENDPOINT}/${jobId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch job");
      const data = await response.json();
      setJob(data);
      setFormData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Fetch company info once job is loaded
  useEffect(() => {
    const fetchCompany = async () => {
      if (!job) return;
      setCompanyLoading(true);
      try {
        const query = job.jobPostingUrl || job.company;
        const info = await getCompanyInfo(query);
        setCompanyInfo(info);
      } catch (err) {
        console.error("Error fetching company info:", err);
      } finally {
        setCompanyLoading(false);
      }
    };
    if (job) fetchCompany();
  }, [job]);

  // ------------------------------
  // Validation + Save
  // ------------------------------
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.company?.trim()) errors.company = "Company is required";
    if (!formData.jobTitle?.trim()) errors.jobTitle = "Job title is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) return;

      const updatePayload = {
        company: formData.company,
        jobTitle: formData.jobTitle,
        location: formData.location,
        status: formData.status,
        notes: formData.notes,
        salaryNotes: formData.salaryNotes,
        interviewNotes: formData.interviewNotes,
        description: formData.description,
        industry: formData.industry,
        type: formData.type,
        jobPostingUrl: formData.jobPostingUrl,
        recruiter: formData.recruiter || {},
        hiringManager: formData.hiringManager || {},
        applicationDeadline: formData.applicationDeadline,
      };

      const response = await fetch(`${JOBS_ENDPOINT}/${job?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) throw new Error("Failed to save job");
      const data = await response.json();
      setJob(data);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error saving job:", err);
      alert("Failed to save changes.");
    }
  };

  // ------------------------------
  // Application history handlers
  // ------------------------------
  const handleAddHistoryEntry = async () => {
    if (!newHistoryEntry.trim()) return alert("Please enter a history entry.");

    try {
      const res = await fetch(`${JOBS_ENDPOINT}/${job?._id}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: newHistoryEntry }),
      });
      if (!res.ok) throw new Error("Failed to add history entry");
      const data = await res.json();
      setJob(data);
      setNewHistoryEntry("");
      setIsAddingHistory(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to add history entry.");
    }
  };

  const handleEditHistoryEntry = async (index: number) => {
    if (!editingHistoryText.trim()) return alert("Please enter text.");
    try {
      const res = await fetch(`${JOBS_ENDPOINT}/${job?._id}/history/${index}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: editingHistoryText }),
      });
      if (!res.ok) throw new Error("Failed to update history entry");
      const data = await res.json();
      setJob(data);
      setEditingHistoryIndex(null);
      setEditingHistoryText("");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to update history entry.");
    }
  };

  const handleDeleteHistoryEntry = async (index: number) => {
    if (!confirm("Delete this history entry?")) return;
    try {
      const res = await fetch(`${JOBS_ENDPOINT}/${job?._id}/history/${index}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete history entry");
      const data = await res.json();
      setJob(data);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to delete history entry.");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!job) return <div className="p-6">Job not found</div>;

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">
            {isEditing ? "Edit Job" : "Job Details"}
          </h2>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => (onClose ? onClose() : navigate("/Jobs"))}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" onClick={handleSave}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(job);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Company"
                value={formData.company}
                isEditing={isEditing}
                onChange={(val) => setFormData({ ...formData, company: val })}
                error={formErrors.company}
              />
              <Field
                label="Position"
                value={formData.jobTitle}
                isEditing={isEditing}
                onChange={(val) => setFormData({ ...formData, jobTitle: val })}
                error={formErrors.jobTitle}
              />
              <Field
                label="Location"
                value={formData.location}
                isEditing={isEditing}
                onChange={(val) => setFormData({ ...formData, location: val })}
              />
              <Field
                label="Status"
                value={formData.status ? STATUS_DISPLAY[formData.status] : ""}
                isEditing={isEditing}
                type="select"
                options={Object.values(STATUS_DISPLAY)}
                onChange={(val) =>
                  setFormData({ ...formData, status: STATUS_VALUE[val] })
                }
              />
            </div>
          </section>

          {/* Company Info Section */}
          <section>
            <h3 className="font-semibold text-lg mb-3">Company Info</h3>
            {companyLoading ? (
              <p className="text-gray-500 text-sm">Loading company details...</p>
            ) : companyInfo ? (
              <Card className="bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={companyInfo.logo || "/images/default-company.png"}
                    alt={`${companyInfo.name} logo`}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {companyInfo.name}
                    </h3>
                    {companyInfo.domain && (
                      <a
                        href={`https://${companyInfo.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline"
                      >
                        {companyInfo.domain}
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 text-sm mt-2">
                  {companyInfo.description?.trim()
                    ? companyInfo.description
                    : "No company description found."}
                </p>
              </Card>
            ) : (
              <p className="text-gray-500 text-sm">No company details found.</p>
            )}
          </section>

          {/* Application History */}
          <section>
            <h3 className="font-semibold text-lg mb-3">Application History</h3>
            <div className="flex justify-between items-center mb-3">
              {!isAddingHistory && (
                <Button
                  variant="secondary"
                  onClick={() => setIsAddingHistory(true)}
                >
                  + Add Entry
                </Button>
              )}
            </div>

            {isAddingHistory && (
              <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                <input
                  type="text"
                  value={newHistoryEntry}
                  onChange={(e) => setNewHistoryEntry(e.target.value)}
                  placeholder="e.g., Called recruiter for follow-up"
                  maxLength={200}
                  className="w-full form-input mb-2"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsAddingHistory(false);
                      setNewHistoryEntry("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddHistoryEntry}>
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              {job.applicationHistory && job.applicationHistory.length > 0 ? (
                [...job.applicationHistory].reverse().map((entry, i) => {
                  const actualIndex = job.applicationHistory!.length - 1 - i;
                  const isEditingRow = editingHistoryIndex === actualIndex;
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-start gap-2"
                    >
                      <div className="flex-1">
                        {isEditingRow ? (
                          <input
                            type="text"
                            value={editingHistoryText}
                            onChange={(e) =>
                              setEditingHistoryText(e.target.value)
                            }
                            className="w-full form-input text-sm"
                          />
                        ) : (
                          <span>{entry.action}</span>
                        )}
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isEditingRow ? (
                          <>
                            <button
                              onClick={() =>
                                handleEditHistoryEntry(actualIndex)
                              }
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingHistoryIndex(null);
                                setEditingHistoryText("");
                              }}
                              className="text-xs px-2 py-1 bg-gray-300 rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingHistoryIndex(actualIndex);
                                setEditingHistoryText(entry.action);
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteHistoryEntry(actualIndex)
                              }
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No history yet</p>
              )}
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

// ================================
// Helper Components
// ================================
function Field({
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  options = [],
  error,
}: {
  label: string;
  value?: string;
  isEditing: boolean;
  onChange: (val: string) => void;
  type?: "text" | "select";
  options?: string[];
  error?: string;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {isEditing ? (
        type === "select" ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full form-input ${error ? "border-red-500" : ""}`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full form-input ${error ? "border-red-500" : ""}`}
          />
        )
      ) : (
        <p className="text-gray-900">{value || "-"}</p>
      )}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}