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
import InterviewInsightsDisplay from "../Interviews/InterviewInsights.tsx"
import { listResumes } from "../../api/resumes";
import { listCoverletters } from "../../api/coverletter";
import CompanyResearchInline from "./CompanyResearchInline";
import ReferencesPanel from "./ReferencesPanel";
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;
const RESUME_VERSIONS_ENDPOINT = `${API_BASE}/api/resume-versions`; // NEW
import MilestoneShareModal from "../Support/MilestoneShareModal";
import { useNavigate } from "react-router-dom";
import JobSalaryBenchmarkCard from "./JobSalaryBenchmarkCard";


// NEW: type for linked resume versions coming from backend
interface LinkedResumeVersion {
  _id: string;
  name?: string;
  resumeId?: string;
  resumeFilename?: string;
  isDefault?: boolean;
  createdAt?: string;
}

  interface NetworkingEventSource {
  _id: string;
  name: string;
  date: string;
  location: string;
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
  const [showInterviewInsights, setShowInterviewInsights] = useState(false);


  // NEW: linked resume state
  const [linkedResumes, setLinkedResumes] = useState<LinkedResumeVersion[] | null>(null);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  // NEW: controls the company info popup
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  // New state for adding application history
  const [newHistoryEntry, setNewHistoryEntry] = useState("");
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  
  // New state for editing application history
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(
    null
  );
  const [editingHistoryText, setEditingHistoryText] = useState("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const currentuserId =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id ;
  const [networkingSources, setNetworkingSources] =
  useState<NetworkingEventSource[]>([]);
  const navigate = useNavigate();


    const [allResumes, setAllResumes] = useState<any[]>([]);
  const [allCoverLetters, setAllCoverLetters] = useState<any[]>([]);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string | null>(null);
    const [packagePortfolioUrl, setPackagePortfolioUrl] = useState<string>("");

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

  useEffect(() => {
    const loadNames = async () => {
      if (!job) return;

      try {
        const userId = job.userId;

        const [resumes, coverLetters] = await Promise.all([
          listResumes({ userid: userId }),
          listCoverletters({ userid: userId }),
        ]);

        setAllResumes(resumes || []);
        setAllCoverLetters(coverLetters || []);

        if (job.applicationPackage) {
          const resume = resumes.find(
            (r: any) => r._id === job.applicationPackage?.resumeId
          );
          const coverLetter = coverLetters.find(
            (c: any) => c._id === job.applicationPackage?.coverLetterId
          );

          setResumeName(resume ? resume.filename : null);
          setCoverLetterName(coverLetter ? coverLetter.filename : null);

          setSelectedResumeId(job.applicationPackage.resumeId || null);
          setSelectedCoverLetterId(job.applicationPackage.coverLetterId || null);
          setPackagePortfolioUrl(job.applicationPackage.portfolioUrl || "");
        } else {
          setResumeName(null);
          setCoverLetterName(null);
          setSelectedResumeId(null);
          setSelectedCoverLetterId(null);
          setPackagePortfolioUrl("");
        }
      } catch (err) {
        console.error("Failed to resolve resume/cover letter names:", err);
      }
    };

    void loadNames();
  }, [job]);


  useEffect(() => {
    fetchJob();
  }, [jobId]);

function authHeaders() {
  const raw = localStorage.getItem("authUser");
  const token = raw ? JSON.parse(raw).token : null;

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

  const handleSaveApplicationPackage = async () => {
    if (!job?._id) return;

    try {
      setSavingPackage(true);
      setPackageError(null);

      const payload: any = {
        applicationPackage: {
          resumeId: selectedResumeId || null,
          coverLetterId: selectedCoverLetterId || null,
          portfolioUrl: packagePortfolioUrl?.trim() || "",
          generatedAt:
            job.applicationPackage?.generatedAt ||
            new Date().toISOString(),
        },
      };

      const response = await fetch(`${JOBS_ENDPOINT}/${job._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save application package");
      }

      setJob(data);
      setFormData((prev) => ({ ...prev, applicationPackage: data.applicationPackage }));

      // update display names
      const resume = allResumes.find((r) => r._id === selectedResumeId);
      const cover = allCoverLetters.find((c) => c._id === selectedCoverLetterId);
      setResumeName(resume ? resume.filename : null);
      setCoverLetterName(cover ? cover.filename : null);

      setPackageModalOpen(false);
      if (onUpdate) onUpdate?.();
    } catch (err: any) {
      console.error("Error saving application package:", err);
      setPackageError(err?.message || "Failed to save application package");
    } finally {
      setSavingPackage(false);
    }
  };
useEffect(() => {
  async function fetchSources() {
    try {
      const res = await fetch(
        `${API_BASE}/api/networking/events/by-job/${jobId}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setNetworkingSources(data);
    } catch (err) {
      console.error(err);
    }
  }
  fetchSources();
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
  // Check if job is at interview stage or later
  const canShowInterviewInsights = job && (
    job.status === "interview" || 
    job.status === "offer" || 
    job.status === "phone_screen"
  );
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
         {/* Interview Insights Button */}
          {canShowInterviewInsights && (
            <section>
              <Button
                variant="primary"
                onClick={() => setShowInterviewInsights(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <span>🎯</span>
                <span>View Interview Insights</span>
              </Button>
            </section>
          )}

        {(job.status === "offer" || job.status === "interview") && (
         <Button type="button" variant="secondary" onClick={() => setShareOpen(true)}>
            Share this win with supporters
          </Button>
            )}
  <MilestoneShareModal
    userId={currentuserId}
    open={shareOpen}
    onClose={() => setShareOpen(false)}
    jobId={job._id}
    jobTitle={job.jobTitle}
    jobCompany={job.company}
    defaultType={
      job.status === "offer"
        ? "OFFER_RECEIVED"
        : "INTERVIEW_SCHEDULED"
    }
    defaultTitle={
      job.status === "offer"
        ? "Got an offer for a new role!"
        : "I have an interview scheduled!"
    }
  />
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Application Package</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // ensure the modal reflects the current job state
                  if (job.applicationPackage) {
                    setSelectedResumeId(job.applicationPackage.resumeId || null);
                    setSelectedCoverLetterId(job.applicationPackage.coverLetterId || null);
                    setPackagePortfolioUrl(job.applicationPackage.portfolioUrl || "");
                  } else {
                    setSelectedResumeId(null);
                    setSelectedCoverLetterId(null);
                    setPackagePortfolioUrl("");
                  }
                  setPackageModalOpen(true);
                }}
              >
                {job.applicationPackage ? "Change" : "Add"}
              </Button>
            </div>

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
<ReferencesPanel
  job={job}
  token={token}
  onJobChange={(updated) => setJob(updated)}
  onUpdate={onUpdate}
/>

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
    <div className="job-side-column">
      {/* other side widgets */}
      <JobSalaryBenchmarkCard job={job} />
    </div>
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
              {job.status === 'offer' && job.finalSalary && (
                <section className="border-t pt-4">
                  <button
                    onClick={() => {
                      // Open in Interview Suite
                      window.location.href = '/Interview-Prep';
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💰</span>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          Salary Negotiation Preparation
                        </div>
                        <div className="text-sm text-gray-600">
                          Get AI-powered strategies and scripts
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                </section>
              )}
              
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
          <div className="mt-10">
  <h2 className="text-xl font-bold mb-3">Networking Activity</h2>

  {networkingSources.length === 0 ? (
    <p className="text-gray-500 italic">
      No networking activities linked to this job.
    </p>
  ) : (
    networkingSources.map((ev) => (
      <div key={ev._id} className="p-4 border rounded mb-3 bg-white shadow">
        <div className="font-semibold">{ev.name}</div>
        <div className="text-sm text-gray-600">
          {ev.date} — {ev.location}
        </div>

        <button
          onClick={() => navigate(`/networking/events/${ev._id}`)}
          className="mt-2 text-blue-600 underline"
        >
          View Event
        </button>
      </div>
    ))
  )}
</div>

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
       {/* Interview Insights Modal */}
      {showInterviewInsights && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4 bg-white sticky top-0 z-10">
              <h3 className="font-semibold text-lg">
                Interview Insights - {job.jobTitle} at {job.company}
              </h3>
              <button
                type="button"
                onClick={() => setShowInterviewInsights(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <div>
              <InterviewInsightsDisplay jobId={job._id} />
            </div>
          </Card>
        </div>
      )}

              {/* Application Package picker modal */}
        {packageModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10001]">
            <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">
                  Select resume & cover letter
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPackageModalOpen(false);
                    setPackageError(null);
                  }}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              {packageError && (
                <p className="text-sm text-red-600 mb-3">{packageError}</p>
              )}

              <div className="space-y-4 text-sm">
                {/* Resume list */}
                <section>
                  <h4 className="font-semibold mb-1">Resume</h4>
                  {allResumes.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      You don’t have any resumes yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="resumeChoice"
                          value=""
                          checked={!selectedResumeId}
                          onChange={() => setSelectedResumeId(null)}
                        />
                        <span>No resume attached</span>
                      </label>
                      {allResumes.map((r: any) => (
                        <label
                          key={r._id}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="resumeChoice"
                              value={r._id}
                              checked={selectedResumeId === r._id}
                              onChange={() => setSelectedResumeId(r._id)}
                            />
                            <span className="font-medium">
                              {r.filename || r.name || "Untitled resume"}
                            </span>
                          </span>
                          {r.updatedAt && (
                            <span className="text-[11px] text-gray-500">
                              Updated{" "}
                              {new Date(r.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </section>

                {/* Cover letter list */}
                <section>
                  <h4 className="font-semibold mb-1">Cover Letter</h4>
                  {allCoverLetters.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      You don’t have any cover letters yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="coverChoice"
                          value=""
                          checked={!selectedCoverLetterId}
                          onChange={() => setSelectedCoverLetterId(null)}
                        />
                        <span>No cover letter attached</span>
                      </label>
                      {allCoverLetters.map((c: any) => (
                        <label
                          key={c._id}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="coverChoice"
                              value={c._id}
                              checked={selectedCoverLetterId === c._id}
                              onChange={() => setSelectedCoverLetterId(c._id)}
                            />
                            <span className="font-medium">
                              {c.filename || c.name || "Untitled cover letter"}
                            </span>
                          </span>
                          {c.updatedAt && (
                            <span className="text-[11px] text-gray-500">
                              Updated{" "}
                              {new Date(c.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </section>

                {/* Portfolio URL */}
                <section>
                  <h4 className="font-semibold mb-1">Portfolio URL (optional)</h4>
                  <input
                    type="url"
                    value={packagePortfolioUrl}
                    onChange={(e) => setPackagePortfolioUrl(e.target.value)}
                    className="w-full form-input text-sm"
                    placeholder="https://your-portfolio.com"
                  />
                </section>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPackageModalOpen(false);
                    setPackageError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveApplicationPackage}
                  disabled={savingPackage}
                >
                  {savingPackage ? "Saving..." : "Save package"}
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

