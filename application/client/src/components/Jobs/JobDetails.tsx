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
import { listResumes } from "../../api/resumes";
import { listCoverletters } from "../../api/coverletter";
import CompanyResearchInline from "./CompanyResearchInline";
import type { GetRefereeResponse } from "../../api/reference";
import { getAllReferee } from "../../api/reference";

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;
const REFERENCE_ENDPOINT =  `${API_BASE}/api/reference`
const RESUME_VERSIONS_ENDPOINT = `${API_BASE}/api/resume-versions`; // NEW

// NEW: type for linked resume versions coming from backend
interface LinkedResumeVersion {
  _id: string;
  name?: string;
  resumeId?: string;
  resumeFilename?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export default function JobDetails({
  jobId,
  onClose,
  onUpdate,
}: JobDetailProps & { onUpdate?: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [coverLetterName, setCoverLetterName] = useState<string | null>(null);


  // NEW: linked resume state
  const [linkedResumes, setLinkedResumes] = useState<LinkedResumeVersion[] | null>(null);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  // NEW: controls the company info popup
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  // New state for adding application history
  const [newHistoryEntry, setNewHistoryEntry] = useState("");
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  // For References 
  const [allReferences, setAllReferences] = useState<GetRefereeResponse[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [showRefModal, setShowRefModal] = useState(false);
  const [refSelection, setRefSelection] = useState<string[]>([]);
  const [showRefRequestModal, setShowRefRequestModal] = useState(false);
  const [activeRefUsage, setActiveRefUsage] = useState<any | null>(null);
  const [requestDraft, setRequestDraft] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeFeedbackUsage, setActiveFeedbackUsage] = useState<any | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_rating: "" as
      | ""
      | "strong_positive"
      | "positive"
      | "neutral"
      | "mixed"
      | "negative",
    feedback_source: "" as "" | "recruiter" | "hiring_manager" | "other",
    feedback_summary: "",
    feedback_notes: "",
  });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
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
    const loadNames = async () => {
      if (!job?.applicationPackage) return;

      try {
        const userId = job.userId;

        const [resumes, coverLetters] = await Promise.all([
          listResumes({ userid: userId }),
          listCoverletters({ userid: userId }),
        ]);

        const resume = resumes.find(
          (r: any) => r._id === job.applicationPackage?.resumeId
        );
        const coverLetter = coverLetters.find(
          (c: any) => c._id === job.applicationPackage?.coverLetterId
        );

        setResumeName(resume ? resume.filename : null);
        setCoverLetterName(coverLetter ? coverLetter.filename : null);
      } catch (err) {
        console.error("Failed to resolve resume/cover letter names:", err);
      }
    };

    loadNames();
  }, [job]);

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

  // fetch resume versions that are linked to this job
  useEffect(() => {
    const fetchLinkedResumes = async () => {
      if (!jobId) return;

      setLinkedLoading(true);
      setLinkedError(null);

      try {
        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
        if (!uid) throw new Error("Missing user session");

        const res = await fetch(
          `${RESUME_VERSIONS_ENDPOINT}/linked-to-job/${jobId}?userid=${uid}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to load linked resumes");
        }

        const data = await res.json();
        const items: LinkedResumeVersion[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        setLinkedResumes(items);
      } catch (e: any) {
        console.error("Error loading linked resumes", e);
        setLinkedError(e?.message || "Failed to load linked resumes");
        setLinkedResumes([]);
      } finally {
        setLinkedLoading(false);
      }
    };

    fetchLinkedResumes();
  }, [jobId, token]);

    // Load all references for this user (for attaching to this job)
  useEffect(() => {
    const loadReferences = async () => {
      try {
        setRefsLoading(true);
        setRefsError(null);

        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
        if (!uid) throw new Error("Missing user session");

        const res = await getAllReferee({ user_id: uid });
        setAllReferences(res.referees ?? []);
      } catch (e: any) {
        console.error("Failed to load references", e);
        setRefsError(e?.message || "Failed to load references.");
      } finally {
        setRefsLoading(false);
      }
    };

    loadReferences();
  }, []);

  
    const toggleRefSelection = (id: string) => {
    setRefSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
    const handleAttachReferences = async () => {
    if (!job?._id || refSelection.length === 0) {
      setShowRefModal(false);
      return;
    }

    try {
      const response = await fetch(`${REFERENCE_ENDPOINT}/addtojob`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referenceIds: refSelection, job_id: job._id}),
      });

      if (!response.ok) {
        throw new Error("Failed to attach references");
      }

      const updated = await response.json();
      setJob(updated);
      setShowRefModal(false);
      setRefSelection([]);

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error attaching references:", err);
      alert("Failed to attach references. Please try again.");
    }
  };
  const handleUpdateReferenceStatus = async (
    reference_id: string,
    status: "planned" | "requested" | "confirmed" | "declined" | "completed"
  ) => {
    if (!job?._id) return;

    try {
      const response = await fetch(
        `${REFERENCE_ENDPOINT}/updaterefstat`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({status: status, referenceId: reference_id, job_id: job._id}),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update reference status");
      }

      const updated = await response.json();
      setJob(updated);

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error updating reference status:", err);
      alert("Failed to update reference status. Please try again.");
    }
  };

    const openFeedbackModal = (usage: any) => {
    setActiveFeedbackUsage(usage);

    setFeedbackForm({
      feedback_rating: usage.feedback_rating || "",
      feedback_source: usage.feedback_source || "",
      feedback_summary: usage.feedback_summary || "",
      feedback_notes: usage.feedback_notes || "",
    });

    setFeedbackError(null);
    setShowFeedbackModal(true);
  };

  const handleSaveFeedback = async () => {
    if (!job?._id || !activeFeedbackUsage) return;

    try {
      setFeedbackSaving(true);
      setFeedbackError(null);
        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
      const response = await fetch(`${REFERENCE_ENDPOINT}/update-feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: job._id,
          referenceId: activeFeedbackUsage.reference_id,
          feedback: {
            feedback_rating: feedbackForm.feedback_rating || undefined,
            feedback_source: feedbackForm.feedback_source || undefined,
            feedback_summary: feedbackForm.feedback_summary || undefined,
            feedback_notes: feedbackForm.feedback_notes || undefined,
          },
          user_id: uid
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("update-feedback error:", err);
        throw new Error("Failed to save feedback");
      }

      const updatedJob = await response.json();
      setJob(updatedJob);
      setShowFeedbackModal(false);
      setActiveFeedbackUsage(null);

      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("Error saving reference feedback:", err);
      setFeedbackError(
        err?.message || "Failed to save feedback. Please try again."
      );
    } finally {
      setFeedbackSaving(false);
    }
  };

    const openRefRequestModal = async (usage: any) => {
    if (!job?._id) return;

    setActiveRefUsage(usage);
    setShowRefRequestModal(true);
    setRequestDraft("");
    setPrepNotes("");
    setRequestError(null);

    try {
      setRequestLoading(true);
        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
        if (!uid) throw new Error("Missing user session");
      const response = await fetch(`${REFERENCE_ENDPOINT}/generate-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: job._id,
          referenceId: usage.reference_id,
          user_id: uid
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("generate-request error:", err);
        throw new Error("Failed to generate reference request");
      }

      const data = await response.json();
      setRequestDraft(data.emailTemplate ?? "");
      setPrepNotes(data.prepNotes ?? "");
    } catch (err: any) {
      console.error("Error generating reference request:", err);
      setRequestError(
        err?.message || "Failed to generate reference request. Please try again."
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleCopyRequest = async () => {
    try {
      await navigator.clipboard.writeText(requestDraft);
      alert("Reference request email copied to clipboard.");
    } catch {
      alert("Failed to copy. You can still select and copy manually.");
    }
  };

  const handleCopyPrepNotes = async () => {
    try {
      await navigator.clipboard.writeText(prepNotes);
      alert("Preparation notes copied to clipboard.");
    } catch {
      alert("Failed to copy. You can still select and copy manually.");
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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999]">
      <Card className="relative z-[10000] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <section>
            <h3 className="font-semibold text-lg mb-3">Application Package</h3>

            {job.applicationPackage ? (
              <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">

                <div className="flex justify-between">
                  <span className="font-medium">Resume</span>
                  <span>
                    {resumeName ??
                      (job.applicationPackage?.resumeId ? "Resume attached" : "—")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">Cover Letter</span>
                  <span>
                    {coverLetterName ??
                      (job.applicationPackage?.coverLetterId
                        ? "Cover letter attached"
                        : "—")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">Portfolio URL</span>
                  <span className="truncate max-w-[60%] text-right">
                    {job.applicationPackage?.portfolioUrl ? (
                      <a
                        href={job.applicationPackage.portfolioUrl}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {job.applicationPackage.portfolioUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Generated</span>
                  <span>
                    {job.applicationPackage?.generatedAt
                      ? new Date(job.applicationPackage.generatedAt).toLocaleString()
                      : "Unknown"}
                  </span>
                </div>

              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No application package has been generated for this job yet.
              </p>
            )}
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
          {/* References for this application */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">References</h3>
              <Button
                variant="secondary"
                onClick={() => {
                  // pre-select ones already attached to this job
                  const existingIds =
                    job.references?.map((r: any) => r.reference_id) ?? [];
                  setRefSelection(existingIds);
                  setShowRefModal(true);
                }}
              >
                + Attach References
              </Button>
            </div>

            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              {refsLoading && (
                <p className="text-gray-500">Loading your references…</p>
              )}
              {refsError && <p className="text-red-600">{refsError}</p>}

              {!refsLoading &&
                !refsError &&
                (!job.references || job.references.length === 0) && (
                  <p className="text-gray-500">
                    No references attached to this application yet.
                  </p>
                )}

              {!refsLoading &&
                !refsError &&
                job.references &&
                job.references.length > 0 && (
                  <ul className="space-y-2">
                    {job.references.map((usage: any) => {
                      const ref = allReferences.find(
                        (r) => r._id === usage.reference_id
                      );

                      return (
                        <li
                          key={usage._id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {ref?.full_name || "Unknown reference"}
                            </span>
                            <span className="text-xs text-gray-600">
                              {ref?.title || ""}
                              {ref?.organization && ` • ${ref.organization}`}
                            </span>
                            {ref?.relationship && (
                              <span className="text-[11px] text-indigo-700">
                                {ref.relationship}
                              </span>
                            )}
                          </div>
                                    <div className="flex flex-col items-end gap-1 text-xs">
                                      {/* Top row: status + both actions */}
                                      <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <select
                                          value={usage.status}
                                          onChange={(e) =>
                                            handleUpdateReferenceStatus(
                                              usage.reference_id,
                                              e.target.value as any
                                            )
                                          }
                                          className="border rounded px-2 py-1 bg-white"
                                        >
                                          <option value="planned">Planned</option>
                                          <option value="requested">Requested</option>
                                          <option value="confirmed">Confirmed</option>
                                          <option value="declined">Declined</option>
                                          <option value="completed">Completed</option>
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() => openRefRequestModal(usage)}
                                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                        >
                                          Generate request
                                        </button>

                                        {/* ✅ New: log feedback */}
                                        <button
                                          type="button"
                                          onClick={() => openFeedbackModal(usage)}
                                          className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                                        >
                                          Log feedback
                                        </button>
                                      </div>

                                      {/* Second row: requested date + feedback pill */}
                                      <div className="flex items-center gap-2">
                                        {usage.requested_at && (
                                          <span className="text-gray-500">
                                            Req:{" "}
                                            {new Date(usage.requested_at).toLocaleDateString()}
                                          </span>
                                        )}

                                        {renderFeedbackPill(usage.feedback_rating)}
                                      </div>

                                      {/* Optional: one-line summary under pill */}
                                      {usage.feedback_summary && (
                                        <p className="text-[11px] text-gray-600 italic max-w-xs text-right">
                                          {usage.feedback_summary}
                                        </p>
                                      )}
                                    </div>



                        </li>
                      );
                    })}
                  </ul>
                )}
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

          {/*Linked resume versions section at the BOTTOM */}
          <section>
            <h3 className="font-semibold text-lg mb-3">
              Linked Resume Versions
            </h3>
            <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
              {linkedLoading && (
                <p className="text-gray-500">Loading linked resumes…</p>
              )}
              {linkedError && (
                <p className="text-red-600">{linkedError}</p>
              )}

              {!linkedLoading &&
                !linkedError &&
                (!linkedResumes || linkedResumes.length === 0) && (
                  <p className="text-gray-500">
                    No resume versions linked to this job yet.
                  </p>
                )}

              {!linkedLoading &&
                !linkedError &&
                linkedResumes &&
                linkedResumes.length > 0 && (
                  <ul className="space-y-1">
                    {linkedResumes.map((r) => (
                      <li
                        key={r._id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">
                            {r.name ||
                              r.resumeFilename ||
                              "Untitled version"}
                          </span>
                          {r.resumeFilename &&
                            r.name &&
                            r.name !== r.resumeFilename && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({r.resumeFilename})
                              </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {r.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              default
                            </span>
                          )}
                          {r.createdAt && (
                            <span>
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </section>
        </div>
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

                {showRefModal && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10001]">
              <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">
                          Attach References to Application
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowRefModal(false)}
                          className="text-gray-500 hover:text-gray-800"
                        >
                          ✕
                        </button>
                      </div>

                      {refsLoading && (
                        <p className="text-gray-500 text-sm">Loading references…</p>
                      )}

                      {!refsLoading && allReferences.length === 0 && (
                        <p className="text-gray-500 text-sm">
                          You don&apos;t have any references yet. Go to{" "}
                          <span className="font-medium">Professional References</span> to
                          add some first.
                        </p>
                      )}
          {!refsLoading && allReferences.length > 0 && job && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 mb-2">
                Select which references you plan to use for this job. We’ll
                recommend the best matches based on availability, usage, and role type.
              </p>

              {(() => {
                const jobType = job.type; // e.g. "internship", "full-time"

                // 1) compute scores & flags per reference
                const scoredRefs = allReferences.map((ref) => {
                  const matchesType =
                    Array.isArray(ref.preferred_opportunity_types) &&
                    ref.preferred_opportunity_types.includes(jobType as any);

                  const unavailable = ref.availability_status === "unavailable";
                  const limited = ref.availability_status === "limited";

                  const overPreferred =
                    ref.preferred_number_of_uses != null &&
                    ref.usage_count != null &&
                    ref.usage_count >= ref.preferred_number_of_uses;

                  let score = 0;
                  if (matchesType) score += 3;
                  if (!unavailable && !overPreferred) score += 2;
                  if (limited) score -= 1;
                  if (unavailable || overPreferred) score -= 5;

                  return {
                    ref,
                    matchesType,
                    unavailable,
                    overPreferred,
                    score,
                  };
                });

                // 2) sort by score (higher = more recommended)
                const sorted = scoredRefs.sort((a, b) => b.score - a.score);

                // 3) render sorted cards
                return (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {sorted.map(({ ref, matchesType, unavailable, overPreferred }) => {
                      const id = ref._id;
                      const isSelected = refSelection.includes(id);

                      const isRecommended =
                        matchesType && !unavailable && !overPreferred;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleRefSelection(id)}
                          className={`w-full text-left border rounded px-3 py-2 text-sm flex justify-between items-center
                            ${
                              isSelected
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          {/* left side: details + pills */}
                          <div>
                            <div className="font-medium">
                              {ref.full_name || "Unnamed reference"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {ref.title}
                              {ref.organization && ` • ${ref.organization}`}
                            </div>
                            {ref.relationship && (
                              <div className="text-[11px] text-indigo-700">
                                {ref.relationship}
                              </div>
                            )}

                            <div className="mt-1 flex flex-wrap gap-1">
                              {isRecommended && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] border border-emerald-200">
                                  Recommended
                                </span>
                              )}
                              {unavailable && (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] border border-red-200">
                                  Not available
                                </span>
                              )}
                              {!unavailable && overPreferred && (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] border border-red-200">
                                  Over preferred use
                                </span>
                              )}
                            </div>
                          </div>

                          {/* right side: stats */}
                          <div className="text-[11px] text-gray-500 text-right">
                            {ref.usage_count != null && (
                              <div>
                                Used in {ref.usage_count}{" "}
                                {ref.usage_count === 1
                                  ? "application"
                                  : "applications"}
                              </div>
                            )}
                            {ref.preferred_number_of_uses != null && (
                              <div>Pref: {ref.preferred_number_of_uses} uses</div>
                            )}
                            {ref.last_used_at && (
                              <div>Last used: {ref.last_used_at}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRefModal(false);
                    setRefSelection([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAttachReferences}
                  disabled={refSelection.length === 0}
                >
                  Attach {refSelection.length || ""} selected
                </Button>
              </div>
            </div>
          )}

                    </Card>
                  </div>
                )}

              {showRefRequestModal && activeRefUsage && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
                  <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg">
                        Reference Request Template
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRefRequestModal(false);
                          setActiveRefUsage(null);
                        }}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        ✕
                      </button>
                    </div>

                    {requestLoading && (
                      <p className="text-sm text-gray-500 mb-3">
                        Generating request and prep notes…
                      </p>
                    )}

                    {requestError && (
                      <p className="text-sm text-red-600 mb-3">{requestError}</p>
                    )}

                    {/* Email template */}
                    <section className="mb-4">
                      <h4 className="font-semibold text-sm mb-1">
                        Email to your reference
                      </h4>
                      <p className="text-xs text-gray-600 mb-1">
                        You can tweak this before sending. We’ll include role, company,
                        and what to highlight.
                      </p>
                      <textarea
                        value={requestDraft}
                        onChange={(e) => setRequestDraft(e.target.value)}
                        rows={8}
                        className="w-full form-input text-sm"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={handleCopyRequest}
                          className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                          Copy email
                        </button>
                      </div>
                    </section>

                    {/* Prep notes / talking points */}
                    <section className="mb-4">
                      <h4 className="font-semibold text-sm mb-1">
                        Role-specific talking points for this reference
                      </h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Share this with your reference so they know how to talk about you for this
                        specific role: which projects to mention, which skills to highlight, and
                        what outcomes to emphasize.
                      </p>
                      <textarea
                        value={prepNotes}
                        onChange={(e) => setPrepNotes(e.target.value)}
                        rows={6}
                        className="w-full form-input text-sm"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={handleCopyPrepNotes}
                          className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                          Copy notes
                        </button>
                      </div>
                    </section>

                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowRefRequestModal(false);
                          setActiveRefUsage(null);
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
      {showFeedbackModal && activeFeedbackUsage && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
          <Card className="w-full max-w-xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                Log Reference Feedback
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setActiveFeedbackUsage(null);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {/* Who is this for */}
            <div className="mb-3 text-sm text-gray-700">
              {(() => {
                const ref = allReferences.find(
                  (r) => r._id === activeFeedbackUsage.reference_id
                );
                return (
                  <>
                    <div>
                      Reference:{" "}
                      <span className="font-medium">
                        {ref?.full_name || "Unknown reference"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {ref?.title}
                      {ref?.organization && ` • ${ref.organization}`}
                    </div>
                  </>
                );
              })()}
            </div>

            {feedbackError && (
              <p className="text-sm text-red-600 mb-2">{feedbackError}</p>
            )}

            <div className="space-y-3 text-sm">
              {/* Rating */}
              <div>
                <label className="form-label text-sm">
                  Overall feedback rating
                </label>
                <select
                  value={feedbackForm.feedback_rating}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({
                      ...prev,
                      feedback_rating: e.target.value as any,
                    }))
                  }
                  className="w-full form-input"
                >
                  <option value="">Select rating</option>
                  <option value="strong_positive">Strong positive</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="mixed">Mixed / unclear</option>
                  <option value="negative">Negative</option>
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="form-label text-sm">
                  Who shared this feedback?
                </label>
                <select
                  value={feedbackForm.feedback_source}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({
                      ...prev,
                      feedback_source: e.target.value as any,
                    }))
                  }
                  className="w-full form-input"
                >
                  <option value="">Select source</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Summary */}
              <div>
                <label className="form-label text-sm">
                  Short summary (what did they say?)
                </label>
                <input
                  type="text"
                  value={feedbackForm.feedback_summary}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({
                      ...prev,
                      feedback_summary: e.target.value,
                    }))
                  }
                  maxLength={180}
                  className="w-full form-input"
                  placeholder='e.g. "Strong team player, great communication and initiative."'
                />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label text-sm">
                  Detailed notes (optional)
                </label>
                <textarea
                  value={feedbackForm.feedback_notes}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({
                      ...prev,
                      feedback_notes: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full form-input"
                  placeholder="Any specific comments or quotes you want to remember..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setActiveFeedbackUsage(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFeedback}
                disabled={feedbackSaving}
              >
                {feedbackSaving ? "Saving..." : "Save feedback"}
              </Button>
            </div>
          </Card>
        </div>
      )}

                        

      </Card>



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

function renderFeedbackPill(rating?: string) {
  if (!rating) return null;

  let label = "";
  let classes = "px-2 py-0.5 rounded-full text-[11px] border ";

  switch (rating) {
    case "strong_positive":
      label = "Strong positive";
      classes += "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "positive":
      label = "Positive";
      classes += "bg-green-50 text-green-700 border-green-200";
      break;
    case "neutral":
      label = "Neutral";
      classes += "bg-gray-50 text-gray-700 border-gray-200";
      break;
    case "mixed":
      label = "Mixed";
      classes += "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "negative":
      label = "Negative";
      classes += "bg-red-50 text-red-700 border-red-200";
      break;
    default:
      return null;
  }

  return <span className={classes}>{label}</span>;
}
