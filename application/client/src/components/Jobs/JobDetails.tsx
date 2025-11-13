import { useState, useEffect, useMemo } from "react";
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import API_BASE from "../../utils/apiBase";
import {
  type Job,
  type JobDetailProps,
  STATUS_DISPLAY,
  STATUS_VALUE,
  type JobStatus,
  type Contact,
} from "../../types/jobs.types";
import InterviewScheduler from "./InterviewScheduler";

import CompanyResearchInline from "./CompanyResearchInline";
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

export default function JobDetails({
  jobId,
  onClose,
  onUpdate,
}: JobDetailProps & { onUpdate?: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [analyzing, setAnalyzing] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState("");

=======
  // NEW: controls the company info popup
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
>>>>>>> 8b15edd7f8a092bc9dd2e40e6552c136ecbb7bcc
  // New state for adding application history
  const [newHistoryEntry, setNewHistoryEntry] = useState("");
  const [isAddingHistory, setIsAddingHistory] = useState(false);

  // New state for editing application history
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
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`${JOBS_ENDPOINT}/${jobId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }

      const data = await response.json();
      setJob(data);
      setFormData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Example required fields
    if (!formData.company?.trim()) errors.company = "Company is required";
    if (!formData.jobTitle?.trim()) errors.jobTitle = "Job title is required";

    // Optional but structured validation
    if (
      formData.recruiter?.email &&
      !/\S+@\S+\.\S+/.test(formData.recruiter.email)
    ) {
      errors.recruiter_email = "Invalid email format for recruiter";
    }

    if (
      formData.hiringManager?.email &&
      !/\S+@\S+\.\S+/.test(formData.hiringManager.email)
    ) {
      errors.hiringManager_email = "Invalid email format for hiring manager";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    try {
      const isValid = validateForm();
      if (!isValid) {
        console.warn("Validation failed — see errors on screen.");
        return;
      }
      console.log("Saving job with data:", formData);

      // Helper function to convert Decimal128 to number
      const getDecimalValue = (decimal: any): number | undefined => {
        if (!decimal) return undefined;
        if (typeof decimal === "number") return decimal;
        if (decimal.$numberDecimal) return parseFloat(decimal.$numberDecimal);
        return undefined;
      };

      // Only send the fields that can be updated
      const updatePayload: any = {
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
      };

      // Helper to ensure contact fields are objects
      const normalizeContact = (contact: any) => {
        if (!contact || typeof contact !== "object") {
          return { name: "", email: "", phone: "", linkedIn: "", notes: "" };
        }
        return contact;
      };

      updatePayload.recruiter = normalizeContact(formData.recruiter);
      updatePayload.hiringManager = normalizeContact(formData.hiringManager);

      // Handle Decimal128 fields properly
      const salaryMin = getDecimalValue(formData.salaryMin);
      const salaryMax = getDecimalValue(formData.salaryMax);
      if (salaryMin !== undefined) updatePayload.salaryMin = salaryMin;
      if (salaryMax !== undefined) updatePayload.salaryMax = salaryMax;

      // Handle applicationDeadline if it exists
      if (formData.applicationDeadline) {
        updatePayload.applicationDeadline = formData.applicationDeadline;
      }

      console.log("Sending update payload:", updatePayload);

      const response = await fetch(`${JOBS_ENDPOINT}/${job?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", errorData);
        throw new Error("Failed to save job");
      }

      const data = await response.json();
      setJob(data);
      setIsEditing(false);

      // Call the onUpdate callback to refresh the parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error saving job:", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleAddHistoryEntry = async () => {
    if (!newHistoryEntry.trim()) {
      alert("Please enter a history entry.");
      return;
    }

    if (newHistoryEntry.length > 200) {
      alert("History entry must be 200 characters or less.");
      return;
    }

    try {
      const response = await fetch(`${JOBS_ENDPOINT}/${job?._id}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: newHistoryEntry }),
      });

      if (!response.ok) {
        throw new Error("Failed to add history entry");
      }

      const data = await response.json();
      setJob(data);
      setNewHistoryEntry("");
      setIsAddingHistory(false);

      // Refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error adding history entry:", err);
      alert("Failed to add history entry. Please try again.");
    }
  };

  const handleEditHistoryEntry = async (index: number) => {
    if (!editingHistoryText.trim()) {
      alert("Please enter a history entry.");
      return;
    }

    if (editingHistoryText.length > 200) {
      alert("History entry must be 200 characters or less.");
      return;
    }

    try {
      const response = await fetch(
        `${JOBS_ENDPOINT}/${job?._id}/history/${index}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: editingHistoryText }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update history entry");
      }

      const data = await response.json();
      setJob(data);
      setEditingHistoryIndex(null);
      setEditingHistoryText("");

      // Refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error updating history entry:", err);
      alert("Failed to update history entry. Please try again.");
    }
  };

  const handleDeleteHistoryEntry = async (index: number) => {
    if (!confirm("Are you sure you want to delete this history entry?")) {
      return;
    }

    try {
      const response = await fetch(
        `${JOBS_ENDPOINT}/${job?._id}/history/${index}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete history entry");
      }

      const data = await response.json();
      setJob(data);

      // Refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error deleting history entry:", err);
      alert("Failed to delete history entry. Please try again.");
    }
  };
  const handleAnalyzeMatch = async () => {
    if (!job?._id) return;
    try {
      setAnalyzing(true);
      setAnalysisError("");

      const response = await fetch(`${JOBS_ENDPOINT}/${job._id}/analyze-match`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to analyze job match");
      }

      const data = await response.json();
      setMatchAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };


  if (loading) return <div className="p-6">Loading...</div>;
  if (!job) return <div className="p-6">Job not found</div>;

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
                <Button variant="secondary" onClick={onClose}>
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

        {/* Content */}
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
                isClickable={!isEditing && !!formData.company}
                onDisplayClick={() => setShowCompanyInfo(true)}
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
                error={formErrors.location}
              />
              <Field
                label="Status"
                value={formData.status ? STATUS_DISPLAY[formData.status] : ""}
                isEditing={isEditing}
                type="select"
                options={[
                  "Interested",
                  "Applied",
                  "Phone Screen",
                  "Interview",
                  "Offer",
                  "Rejected",
                ]}
                onChange={(val) =>
                  setFormData({ ...formData, status: STATUS_VALUE[val] })
                }
                error={formErrors.status}
              />
            </div>
          </section>

          {/* Contacts */}
          <section>
            <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <ContactFields
                label="Recruiter"
                contact={formData.recruiter || {}}
                isEditing={isEditing}
                onChange={(contact) =>
                  setFormData({ ...formData, recruiter: contact })
                }
                formErrors={formErrors}
              />
              <ContactFields
                label="Hiring Manager"
                contact={formData.hiringManager || {}}
                isEditing={isEditing}
                onChange={(contact) =>
                  setFormData({ ...formData, hiringManager: contact })
                }
                formErrors={formErrors}
              />
            </div>
          </section>

          {/* Notes Sections */}
          <TextArea
            label="Personal Notes"
            value={formData.notes}
            isEditing={isEditing}
            onChange={(val) => setFormData({ ...formData, notes: val })}
          />

          <TextArea
            label="Salary Negotiation Notes"
            value={formData.salaryNotes}
            isEditing={isEditing}
            onChange={(val) => setFormData({ ...formData, salaryNotes: val })}
          />

          <TextArea
            label="Interview Notes & Feedback"
            value={formData.interviewNotes}
            isEditing={isEditing}
            onChange={(val) =>
              setFormData({ ...formData, interviewNotes: val })
            }
          />

          {/* Interview Scheduling Section */}
          <div className="mt-8">
            <InterviewScheduler jobId={job._id} />
          </div>

          {/* Status History */}
          <section>
            <h3 className="font-semibold text-lg mb-3">Status History</h3>
            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              {job.statusHistory && job.statusHistory.length > 0 ? (
                [...job.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {STATUS_DISPLAY[entry.status]}
                      </span>
                      {entry.note && (
                        <span className="text-gray-600">{entry.note}</span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No status changes yet</p>
              )}
            </div>
          </section>

          {/* Application History */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Application History</h3>
              {!isAddingHistory && (
                <Button
                  variant="secondary"
                  onClick={() => setIsAddingHistory(true)}
                >
                  + Add Entry
                </Button>
              )}
            </div>
              {/* Match Analysis Section */}
             <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-lg">Match Analysis</h3>
                  <Button
                    variant="primary"
                    onClick={handleAnalyzeMatch}
                    disabled={analyzing}
                  >
                    {analyzing ? "Analyzing..." : "Analyze Match"}
                  </Button>
                </div>

                {analysisError && (
                  <p className="text-red-600 text-sm">{analysisError}</p>
                )}

                {matchAnalysis && (
                  <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                    {/* Overall Score with color */}
                    <p className="font-semibold">
                      Overall Match Score:{" "}
                      <span
                        className={
                          matchAnalysis.matchScore >= 90
                            ? "text-green-700"
                            : matchAnalysis.matchScore >= 70
                            ? "text-yellow-600"
                            : "text-red-600"
                        }
                      >
                        {matchAnalysis.matchScore || 0}%
                      </span>
                    </p>

                    {/* Category Breakdown with Highlights */}
                    <ul className="list-disc pl-6 space-y-1">
                      <li
                        className={
                          matchAnalysis.matchBreakdown?.skills < 70
                            ? "text-red-600"
                            : matchAnalysis.matchBreakdown?.skills < 90
                            ? "text-yellow-600"
                            : "text-green-700"
                        }
                      >
                        Skills: {matchAnalysis.matchBreakdown?.skills ?? 0}%
                      </li>
                      <li
                        className={
                          matchAnalysis.matchBreakdown?.experience < 70
                            ? "text-red-600"
                            : matchAnalysis.matchBreakdown?.experience < 90
                            ? "text-yellow-600"
                            : "text-green-700"
                        }
                      >
                        Experience: {matchAnalysis.matchBreakdown?.experience ?? 0}%
                      </li>
                      <li
                        className={
                          matchAnalysis.matchBreakdown?.education < 70
                            ? "text-red-600"
                            : matchAnalysis.matchBreakdown?.education < 90
                            ? "text-yellow-600"
                            : "text-green-700"
                        }
                      >
                        Education: {matchAnalysis.matchBreakdown?.education ?? 0}%
                      </li>
                    </ul>

                    {/* Strengths / Gaps Feedback */}
                    <div className="mt-3 text-gray-700 text-sm">
                      {matchAnalysis.matchScore >= 90 && (
                        <p>💪 Excellent match — your profile fits this job very well!</p>
                      )}
                      {matchAnalysis.matchScore >= 70 && matchAnalysis.matchScore < 90 && (
                        <p>👍 Good match — a few small improvements could make it perfect.</p>
                      )}
                      {matchAnalysis.matchScore < 70 && (
                        <p>⚠️ Some areas need improvement — focus on red or yellow sections above.</p>
                      )}
                    </div>

                    {/* Suggestions */}
                    {matchAnalysis.suggestions?.length > 0 && (
                      <>
                        <h4 className="font-semibold mt-3">Suggestions for Improvement:</h4>
                        <ul className="list-disc pl-6 text-gray-700">
                          {matchAnalysis.suggestions.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}

                  </div>
                )}
              </section>
            {/* Add new entry form */}
            {isAddingHistory && (
              <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                <label className="form-label">New History Entry</label>
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
                    Add Entry
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              {job.applicationHistory && job.applicationHistory.length > 0 ? (
                [...job.applicationHistory].reverse().map((entry, i) => {
                  const actualIndex = job.applicationHistory!.length - 1 - i;
                  const isEditing = editingHistoryIndex === actualIndex;

                  return (
                    <div
                      key={i}
                      className="flex justify-between items-start gap-2"
                    >
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingHistoryText}
                            onChange={(e) =>
                              setEditingHistoryText(e.target.value)
                            }
                            maxLength={200}
                            className="w-full form-input text-sm"
                          />
                        ) : (
                          <span>{entry.action}</span>
                        )}
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() =>
                                handleEditHistoryEntry(actualIndex)
                              }
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingHistoryIndex(null);
                                setEditingHistoryText("");
                              }}
                              className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteHistoryEntry(actualIndex)
                              }
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
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
      {showCompanyInfo && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <Card className="w-full max-w-4xl max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b p-4">
        <h3 className="font-semibold text-lg">
          Company Research: {formData.company || "Unknown Company"}
        </h3>
        <button
          type="button"
          onClick={() => setShowCompanyInfo(false)}
          className="text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>
      </div>
      <div className="p-4">
        <CompanyResearchInline companyName={formData.company || ""} />
      </div>
    </Card>
  </div>
)}

    </div>
  );
}

// Helper components remain the same...
interface FieldProps {
  label: string;
  value?: string;
  isEditing: boolean;
  onChange: (val: string) => void;
  type?: "text" | "select";
  options?: string[];
  error?: string;
  isClickable?: boolean;
  onDisplayClick?: () => void;
}

function Field({
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  options = [],
  error,
  isClickable,
  onDisplayClick,
}: FieldProps) {
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
        <>
          {isClickable && value ? (
            <button
              type="button"
              onClick={onDisplayClick}
              className="text-blue-600 hover:underline font-medium"
            >
              {value}
            </button>
          ) : (
            <p className="text-gray-900">{value || "-"}</p>
          )}
        </>
      )}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

interface TextAreaProps {
  label: string;
  value?: string;
  isEditing: boolean;
  onChange: (val: string) => void;
}

function TextArea({ label, value, isEditing, onChange }: TextAreaProps) {
  return (
    <section>
      <h3 className="font-semibold text-lg mb-3">{label}</h3>
      {isEditing ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full form-input"
        />
      ) : (
        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
          {value || <span className="text-gray-500">No notes yet</span>}
        </div>
      )}
    </section>
  );
}

// ContactFields Component
interface ContactFieldsProps {
  label: string;
  contact?: Contact;
  isEditing: boolean;
  onChange: (contact: Contact) => void;
  formErrors?: Record<string, string>;
}

function ContactFields({
  label,
  contact = {},
  isEditing,
  onChange,
  formErrors = {},
}: ContactFieldsProps) {
  const handleFieldChange = (field: keyof Contact, value: string) => {
    onChange({
      ...contact,
      [field]: value,
    });
  };

  const prefix = label.toLowerCase().replace(" ", "");
  const emailError = formErrors[`${prefix}_email`];
  const phoneError = formErrors[`${prefix}_phone`];

  if (
    !isEditing &&
    !contact?.name &&
    !contact?.email &&
    !contact?.phone &&
    !contact?.linkedIn &&
    !contact?.notes
  ) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-md text-gray-700">{label}</h4>
        <p className="text-gray-500 italic">No contact info</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-md text-gray-700">{label}</h4>
      <div className="space-y-3">
        <div>
          <label className="form-label text-sm">Name</label>
          {isEditing ? (
            <input
              type="text"
              value={contact?.name || ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="w-full form-input"
              placeholder="John Doe"
            />
          ) : (
            <p className="text-gray-900">{contact?.name || "-"}</p>
          )}
        </div>

        <div>
          <label className="form-label text-sm">Email</label>
          {isEditing ? (
            <input
              type="email"
              value={contact?.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className={`w-full form-input ${emailError ? "border-red-500" : ""
                }`}
              placeholder="john@company.com"
            />
          ) : (
            <p className="text-gray-900">
              {contact?.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {contact.email}
                </a>
              ) : (
                "-"
              )}
            </p>
          )}
          {emailError && (
            <p className="text-red-600 text-xs mt-1">{emailError}</p>
          )}
        </div>

        <div>
          <label className="form-label text-sm">Phone</label>
          {isEditing ? (
            <input
              type="tel"
              value={contact?.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              className="w-full form-input"
              placeholder="+1 (555) 123-4567"
            />
          ) : (
            <p className="text-gray-900">
              {contact?.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {contact.phone}
                </a>
              ) : (
                "-"
              )}
            </p>
          )}
          {phoneError && (
            <p className="text-red-600 text-xs mt-1">{phoneError}</p>
          )}
        </div>

        <div>
          <label className="form-label text-sm">LinkedIn</label>
          {isEditing ? (
            <input
              type="url"
              value={contact?.linkedIn || ""}
              onChange={(e) => handleFieldChange("linkedIn", e.target.value)}
              className="w-full form-input"
              placeholder="linkedin.com/in/johndoe"
            />
          ) : (
            <p className="text-gray-900">
              {contact?.linkedIn ? (
                <a
                  href={
                    contact.linkedIn.startsWith("http")
                      ? contact.linkedIn
                      : `https://${contact.linkedIn}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Profile
                </a>
              ) : (
                "-"
              )}
            </p>
          )}
        </div>

        <div>
          <label className="form-label text-sm">Notes</label>
          {isEditing ? (
            <textarea
              value={contact?.notes || ""}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              className="w-full form-input"
              rows={2}
              placeholder="Additional notes about this contact..."
            />
          ) : (
            <p className="text-gray-900 whitespace-pre-wrap">
              {contact?.notes || "-"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
