// src/components/Resume/ResumeEditor.tsx
import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";

import Button from "../StyledComponents/Button";

import { resumePreviewRegistry, resumePdfRegistry } from "./index";

import type {
  ResumeData,
  TemplateKey,
  ContactInfo,
  FeedbackSummaryResponse,
} from "../../api/resumes";
import getAuthHeaders, {
  saveResume,
  updateResume,
  GetAiResumeContent,
  createSharedResume,
  getFullResume,
  updateResumeWorkflow,
  getResumeFeedbackSummary,
  fetchResumeVersions,
  createResumeVersionNew,
} from "../../api/resumes";

import JobPickerSheet from "./JobPickerSheet";
import MiniJobForm, { type JobDraft } from "./MiniJobForm";
import { useJobs, type Job } from "./hooks/useJobs";

import { THEMES, TEMPLATE_DEFAULT_THEME, type ThemeKey } from "./resumeThemes";

import type {
  LocationState,
  SectionId,
  SectionConfig,
  ValidationSummary,
  ExportFormat,
  AiResumeCandidate,
} from "./ResumeEditor.types";
import { DEFAULT_SECTIONS } from "./ResumeEditor.types";

import {
  createBaseResumeDefaults,
  runResumeValidation,
  exportResume,
  safeGetUser,
  loadContactFromProfile,
  skillNamesToObjects,
  skillsCsv,
  normalizeSkillsForPreview,
} from "./ResumeEditor.utils";

import { ValidationPanel } from "./ValidationPanel";

import {
  startProductivitySession,
  endProductivitySession,
} from "../../api/productivity";
import type { WorkflowStatus } from "../../api/coverletter";
import type { ReviewerMeta } from "../Coverletter/MiniReviewProgress";
import MiniReviewProgress from "../Coverletter/MiniReviewProgress";
const API_URL = "http://localhost:5050/api/resumes";

// ---- simple modal ----
function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] max-w-lg bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ResumeEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || null) as LocationState | null;

  const template = state?.template;
  const initialId = state?.ResumeId ?? null;
  const initialPayload = state?.resumeData;
  const currentUserid =
    JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  // Guard: if someone hits this route directly with no template
  useEffect(() => {
    if (!template) {
      navigate("/resumes", { replace: true });
    }
  }, [template, navigate]);

  //Time Tracking for Productivity
  useEffect(() => {
    let canceled = false;
    let sessionId: string | null = null;

    (async () => {
      try {
        const session = await startProductivitySession({
          activityType: "resume_edit",
          context: "ResumeEditor",
        });
        if (!canceled) {
          sessionId = session._id;
        }
      } catch (err) {
        console.error(
          "[productivity] Failed to start resume_edit session:",
          err
        );
      }
    })();

    return () => {
      canceled = true;
      if (sessionId) {
        endProductivitySession({ sessionId }).catch((err) =>
          console.error(
            "[productivity] Failed to end resume_edit session:",
            err
          )
        );
      }
    };
  }, []);

  if (!template) {
    return null;
  }

  /* Defaults */

  const baseDefaults = createBaseResumeDefaults();

  // Optional AI defaults (same idea as backup)
  let aiInjectedData: ResumeData | null = null;
  let initialAiCandidates: AiResumeCandidate[] = [];

  if (state?.AImode && state.AiResume) {
    const ai = state.AiResume as any;

    const candidates: AiResumeCandidate[] =
      Array.isArray(ai.parsedCandidates) && ai.parsedCandidates.length > 0
        ? (ai.parsedCandidates as AiResumeCandidate[])
        : ai.data
        ? [ai.data as AiResumeCandidate]
        : [];

    if (candidates.length > 0) {
      initialAiCandidates = candidates;
      const rawCandidate = candidates[0] as unknown as Partial<ResumeData>;
      aiInjectedData = { ...baseDefaults, ...rawCandidate };
    }
  }

  /* State */

  const [resumeId, setResumeId] = useState<string | null>(initialId);
  const [filename, setFilename] = useState<string>(
    initialPayload?.filename || "Untitled"
  );
  const [data, setData] = useState<ResumeData>(
    aiInjectedData || initialPayload?.resumedata || baseDefaults
  );
  const [lastSaved, setLastSaved] = useState<string | null>(
    initialPayload?.lastSaved || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const draggableSections = useMemo(
    () =>
      sections.filter(
        (s) => s.id !== "header" && s.id !== "contact" // adjust IDs if needed
      ),
    [sections]
  );
  const [draggingId, setDraggingId] = useState<SectionId | null>(null);
  const visibleSectionIds = useMemo(
    () => draggableSections.filter((s) => s.enabled).map((s) => s.id),
    [draggableSections]
  );

  // Theme
  const initialThemeKey: ThemeKey =
    TEMPLATE_DEFAULT_THEME[template.key] || "classic";
  const [themeKey, setThemeKey] = useState<ThemeKey>(initialThemeKey);
  const theme = THEMES[themeKey];

  // Validation
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  // AI variants (for suggestions UI)
  const [aiVars, setAiVars] =
    useState<AiResumeCandidate[]>(initialAiCandidates);
  const [aiIdx, setAiIdx] = useState(0);

  // Jobs / AI
  const { jobs, loading: jobsLoading, err: jobsError, isLoggedIn } = useJobs();
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [showShareSettings, setShowShareSettings] = useState(false);
  const [shareVisibility, setShareVisibility] = useState<
    "public" | "unlisted" | "restricted"
  >("unlisted");
  const [shareAllowComments, setShareAllowComments] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareTab, setShareTab] = useState<"settings" | "people">("settings");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [shareDeadline, setShareDeadline] = useState<string>(""); // ISO date string "YYYY-MM-DD"

  const [inviteRole, setInviteRole] = useState<
    "mentor" | "peer" | "advisor" | "recruiter" | "other"
  >("mentor");
  const [inviteCanComment, setInviteCanComment] = useState<boolean>(true);
  const [inviteCanResolve, setInviteCanResolve] = useState<boolean>(false);
  const [feedbackSummaryOpen, setFeedbackSummaryOpen] = useState(false);
  const [feedbackSummaryLoading, setFeedbackSummaryLoading] = useState(false);
  const [feedbackSummaryError, setFeedbackSummaryError] = useState<
    string | null
  >(null);
  const [feedbackSummary, setFeedbackSummary] =
    useState<FeedbackSummaryResponse | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("draft");
  const [approvedByName, setApprovedByName] = useState<string | undefined>();
  const [approvedAt, setApprovedAt] = useState<string | undefined>();
  const [updatingWorkflow, setUpdatingWorkflow] = useState(false);
  const [reviewers, setReviewers] = useState<ReviewerMeta[]>([]);

  // Version management
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versions, setVersions] = useState<
    Array<{ _id: string; name: string; createdAt: string }>
  >([]);

  const handleAddInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;

    // basic email validation
    const isValid = /\S+@\S+\.\S+/.test(email);
    if (!isValid) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    if (!invitedEmails.includes(email)) {
      setInvitedEmails((prev) => [...prev, email]);
    }
    setReviewers((prev) => {
      // avoid duplicates
      if (prev.some((r) => r.email === email)) return prev;
      return [
        ...prev,
        {
          email,
          role: inviteRole,
          status: "invited",
        },
      ];
    });

    setInviteEmail("");
    setInviteError(null);
    try {
      const out = await createSharedResume({
        userid: currentUserid,
        resumeid: resumeId ?? "",
        resumedata: data,
        visibility: shareVisibility,
        allowComments: shareAllowComments,

        reviewDeadline: shareDeadline,
      });

      setShareUrl(out.url || null);

      let inviteData = {
        toemail: inviteEmail,
        sharedurl: out.url,
        resumeId: resumeId,
        role: inviteRole,
        canComment: inviteCanComment,
        canResolve: inviteCanResolve,
        reviewDeadline: shareDeadline,
      };

      const res = await fetch(`${API_URL}/invite?userId=${currentUserid}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(inviteData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to invite supporter");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error inviting supporter");
    }
  };
  const handleOpenFeedbackSummary = async () => {
    if (!resumeId) return;

    setFeedbackSummaryOpen(true);
    setFeedbackSummaryLoading(true);
    setFeedbackSummaryError(null);

    try {
      const summary = await getResumeFeedbackSummary({
        userid: currentUserid,
        resumeid: resumeId,
      });
      setFeedbackSummary(summary);
    } catch (err: unknown) {
      console.error("Failed to load feedback summary", err);
      const msg =
        err instanceof Error ? err.message : "Failed to load feedback summary";
      setFeedbackSummaryError(msg);
    } finally {
      setFeedbackSummaryLoading(false);
    }
  };
  const handleRemoveInvite = async (emailToRemove: string) => {
    setInvitedEmails((prev) => prev.filter((e) => e !== emailToRemove));
    setReviewers((prev) => prev.filter((r) => r.email !== emailToRemove));

    let inviteremoveData = {
      resumeid: resumeId,
      email: emailToRemove,
    };
    const res = await fetch(`${API_URL}/removeinvite?userId=${currentUserid}`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(inviteremoveData),
    });
    if (res) alert("Removed Acces");
  };
  /* Derived */

  const handleChangeWorkflowStatus = async (next: WorkflowStatus) => {
    if (!resumeId || next === workflowStatus) return;

    try {
      setUpdatingWorkflow(true);
      const res = await updateResumeWorkflow({
        resumeid: resumeId,
        status: next,
      });

      setWorkflowStatus(res.workflowStatus);
      setApprovedByName(res.approvedByName);
      setApprovedAt(res.approvedAt || undefined);
    } catch (err) {
      console.error("Failed to update workflow status", err);
      // optional: show toast
    } finally {
      setUpdatingWorkflow(false);
    }
  };

  const handleShareConfirm = async () => {
    try {
      setShareLoading(true);

      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid || !resumeId) throw new Error("Missing session or resume id");

      const out = await createSharedResume({
        userid: uid,
        resumeid: resumeId,
        resumedata: data,
        visibility: shareVisibility,
        allowComments: shareAllowComments,

        reviewDeadline: shareDeadline,
      });

      setShareUrl(out.url || null);
      await navigator.clipboard.writeText(out.url);
      alert("Share link copied to clipboard!");

      setShowShareSettings(false);
    } catch (e: any) {
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => {
    if (!resumeId) return;

    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) throw new Error("Not signed in (authUser missing).");
      const user = JSON.parse(raw).user;

      getFullResume({
        userid: user._id,
        resumeid: resumeId,
      })
        .then((resp) => {
          console.log(resp);
          const status = resp.workflowStatus || "draft";
          setWorkflowStatus(status);
          setApprovedByName(resp.approvedByName);
          setApprovedAt(resp.approvedAt || undefined);

          setShareAllowComments(resp.allowComments ?? true);
          setShareVisibility(resp.visibility ?? "restricted");
          const iso = resp.reviewDeadline ?? "";
          const formattedDate = iso.split("T")[0]; // "2222-12-21"

          setShareDeadline(formattedDate);
          setInvitedEmails(
            resp.reviewers?.map((r: { email: any }) => r.email) ??
              resp.restricteduserid ??
              []
          );
          setReviewers(
            resp.reviewers?.map(
              (r: {
                email: any;
                role: string | undefined;
                status: any;
                lastActivityAt: string | number | Date;
                completedAt: string | number | Date;
              }) => ({
                email: r.email,
                role: r.role as ReviewerMeta["role"],
                status: r.status,
                lastActivityAt: r.lastActivityAt
                  ? new Date(r.lastActivityAt).toISOString()
                  : undefined,
                completedAt: r.completedAt
                  ? new Date(r.completedAt).toISOString()
                  : undefined,
              })
            ) ?? []
          );
        })
        .catch((err) => setError(err?.message ?? String(err)));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [resumeId]);

  

  const previewData: ResumeData = useMemo(() => {
    const clone: ResumeData = { ...data };

    if (!visibleSectionIds.includes("summary")) clone.summary = "";
    if (!visibleSectionIds.includes("skills")) {
      clone.skills = [];
    } else {
      clone.skills = normalizeSkillsForPreview(clone.skills);
    }
    if (!visibleSectionIds.includes("experience")) clone.experience = [];
    if (!visibleSectionIds.includes("education")) clone.education = [];
    if (!visibleSectionIds.includes("projects")) clone.projects = [];

    return clone;
  }, [data, visibleSectionIds]);

  const activeCandidate =
    aiVars.length > 0 ? aiVars[Math.min(aiIdx, aiVars.length - 1)] : undefined;

  const combinedSkills: string[] =
    activeCandidate && (activeCandidate.skills || activeCandidate.atsKeywords)
      ? Array.from(
          new Set([
            ...(activeCandidate.skills || []),
            ...(activeCandidate.atsKeywords || []),
          ])
        )
      : [];

  const Preview = useMemo(
    () => resumePreviewRegistry[template.key],
    [template.key]
  );
  const PdfComp = useMemo(
    () => resumePdfRegistry[template.key],
    [template.key]
  );

  const pdfDoc = useMemo(
    () => <PdfComp data={data} />,
    [PdfComp, data, themeKey]
  );

  /* Section controls */

  function toggleSectionEnabled(id: SectionId) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : { ...s }))
    );
  }

  function handleDragStart(id: SectionId) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(id: SectionId) {
    setSections((prev) => {
      if (!draggingId || draggingId === id) return prev;

      const items = [...prev];
      const fromIndex = items.findIndex((s) => s.id === draggingId);
      const toIndex = items.findIndex((s) => s.id === id);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items;
    });
    setDraggingId(null);
  }

  /* Simple mutators */

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setData((d) => ({ ...d, name: value }));
  };

  const handleContactChange =
    (field: keyof ContactInfo) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setData((d) => ({
        ...d,
        contact: {
          ...(d.contact || {}),
          [field]: value,
        },
      }));
    };

  const handleSummaryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setData((d) => ({ ...d, summary: value }));
  };

  const replaceSummary = (summary: string) => {
    setData((d) => ({ ...d, summary }));
  };

  const handleSkillsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = skillNamesToObjects(value);
    setData((d) => ({ ...d, skills: parsed }));
  };

  // Experience
  const addExperience = () => {
    setData((d) => ({
      ...d,
      experience: [
        ...(d.experience || []),
        {
          company: "",
          jobTitle: "",
          startDate: "",
          endDate: null,
          location: "",
          highlights: [],
        } as any,
      ],
    }));
  };

  const updateExperienceField =
    (idx: number, field: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setData((d) => {
        const arr = [...(d.experience || [])] as any[];
        const target = { ...(arr[idx] || {}) };

        if (field === "highlights") {
          target.highlights = value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          (target as any)[field] = value;
        }

        arr[idx] = target;
        return { ...d, experience: arr };
      });
    };

  const removeExperience = (idx: number) => {
    setData((d) => {
      const arr = [...(d.experience || [])];
      arr.splice(idx, 1);
      return { ...d, experience: arr };
    });
  };

  // Education
  const addEducation = () => {
    setData((d) => ({
      ...d,
      education: [
        ...(d.education || []),
        {
          institution: "",
          degree: "",
          fieldOfStudy: "",
          graduationDate: "",
        } as any,
      ],
    }));
  };

  const updateEducationField =
    (idx: number, field: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setData((d) => {
        const arr = [...(d.education || [])] as any[];
        const target = { ...(arr[idx] || {}) };
        (target as any)[field] = value;
        arr[idx] = target;
        return { ...d, education: arr };
      });
    };

  const removeEducation = (idx: number) => {
    setData((d) => {
      const arr = [...(d.education || [])];
      arr.splice(idx, 1);
      return { ...d, education: arr };
    });
  };

  // Projects
  const addProject = () => {
    setData((d) => ({
      ...d,
      projects: [
        ...(d.projects || []),
        {
          name: "",
          technologies: "",
          outcomes: "",
        } as any,
      ],
    }));
  };

  const updateProjectField =
    (idx: number, field: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setData((d) => {
        const arr = [...(d.projects || [])] as any[];
        const target = { ...(arr[idx] || {}) };
        (target as any)[field] = value;
        arr[idx] = target;
        return { ...d, projects: arr };
      });
    };

  const removeProject = (idx: number) => {
    setData((d) => {
      const arr = [...(d.projects || [])];
      arr.splice(idx, 1);
      return { ...d, projects: arr };
    });
  };

  /* Validation */

  const handleRunValidation = () => {
    const v = runResumeValidation(data);
    setValidation(v);
    setLastValidatedAt(new Date().toISOString());
  };

  /* Save / export */

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const user = safeGetUser();
      const uid = user._id;
      const ts = new Date().toISOString();

      if (!resumeId) {
        const created = await saveResume({
          userid: uid,
          filename,
          templateKey: template.key,
          resumedata: data,
          lastSaved: ts,
        });
        const id = (created as any)?._id || (created as any)?.resumeid || null;
        setResumeId(id);
        setLastSaved(ts);
        alert("Resume saved.");
      } else {
        await updateResume({
          resumeid: resumeId,
          userid: uid,
          filename,
          resumedata: data,
          lastSaved: ts,
          templateKey: template.key,
        });
        setLastSaved(ts);
        alert("Resume updated.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndBack = async () => {
    await handleSave();
    navigate("/resumes");
  };

  const handleExport = async (format: ExportFormat) => {
    await exportResume({
      format,
      filename,
      templateKey: template.key,
      data,
      lastSaved,
      pdfDoc,
      onError: (msg) => setError(msg),
    });
  };

  /* Version Management */

  const loadVersions = async () => {
    if (!resumeId) return;

    try {
      const userid = getUserId();
      if (!userid) return;

      const versionData = await fetchResumeVersions({
        userid,
        resumeid: resumeId,
      });
      setVersions(versionData?.items || []);
    } catch (err) {
      console.error("Failed to load versions:", err);
    }
  };

  const handleCreateVersion = async () => {
    if (!resumeId || !versionName.trim()) {
      alert("Please enter a version name");
      return;
    }

    try {
      setCreatingVersion(true);
      const userid = getUserId();
      if (!userid) throw new Error("Missing user session");

      await createResumeVersionNew({
        userid,
        resumeid: resumeId,
        sourceVersionId: null, // Clone from base resume
        name: versionName.trim(),
        description: `Created on ${new Date().toLocaleDateString()}`,
      });

      // Refresh versions list
      await loadVersions();

      // Reset and close
      setVersionName("");
      setShowCreateVersionModal(false);
      alert("Version created successfully!");
    } catch (err) {
      console.error("Failed to create version:", err);
      alert("Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  };

  function getUserId() {
    const raw = localStorage.getItem("authUser");
    const auth = raw ? JSON.parse(raw) : null;
    return auth?.user?._id || auth?._id || localStorage.getItem("userid") || "";
  }

  // Load versions when resume loads
  useEffect(() => {
    if (resumeId) {
      loadVersions();
    }
  }, [resumeId, loadVersions]);

  /* AI helpers – same applyAiCandidate/runAiWithJob logic as backup,
     plus tracking multiple variants for the suggestions UI. */

  function applyAiCandidate(candidate: AiResumeCandidate) {
  setData((d) => {
    const next: ResumeData = { ...d };
    const exp = [...(next.experience || [])] as any[];

    // Experience bullets → merge into experience
    if (Array.isArray(candidate.experienceBullets)) {
      candidate.experienceBullets.forEach((eb) => {
        const rawIdx = Number(eb?.sourceExperienceIndex ?? -1);
        const idx = rawIdx >= 0 ? rawIdx : exp.length;

        const startFromEb = eb.startDate || "";
        const endFromEb = eb.endDate || "";
        const locFromEb = eb.location || "";

        if (!exp[idx]) {
          exp[idx] = {
            company: eb.company || "",
            jobTitle: eb.jobTitle || "",
            startDate: startFromEb,
            endDate: endFromEb,
            location: locFromEb,
            highlights: [],
          };
        }

        const existingHighlights = Array.isArray(exp[idx].highlights)
          ? [...exp[idx].highlights]
          : [];

        for (const b of eb.bullets || []) {
          if (!existingHighlights.includes(b)) existingHighlights.push(b);
        }

        exp[idx] = {
          ...exp[idx],
          company: exp[idx].company || eb.company || "",
          jobTitle: exp[idx].jobTitle || eb.jobTitle || "",
          startDate: exp[idx].startDate || startFromEb,
          endDate:
            exp[idx].endDate !== null && exp[idx].endDate !== undefined
              ? exp[idx].endDate
              : endFromEb,
          location: exp[idx].location || locFromEb,
          highlights: existingHighlights,
        };
      });
    }

    next.experience = exp;

    // Skills / ATS keywords → merge into skills array
    const have = new Set(
      (next.skills || [])
        .map((s: any) => (typeof s === "string" ? s : s?.name))
        .filter(Boolean)
    );
    const incoming = [
      ...(candidate.skills || []),
      ...(candidate.atsKeywords || []),
    ];
    const toAdd = incoming.filter(
      (s: string) => s && !have.has(String(s))
    );
    next.skills = [
      ...(next.skills || []),
      ...toAdd.map((name: string) => ({ name })),
    ];

    // --- merge education suggestions into resume education ---
    if (Array.isArray((candidate as any).education)) {
      const incomingEdu = (candidate as any).education as Array<{
        institution?: string;
        degree?: string;
        fieldOfStudy?: string;
        graduationDate?: string;
      }>;

      const existingEdu = Array.isArray((next as any).education)
        ? [...(next as any).education]
        : [];

      for (const e of incomingEdu) {
        const key = [
          (e.institution || "").trim(),
          (e.degree || "").trim(),
          (e.fieldOfStudy || "").trim(),
        ]
          .filter(Boolean)
          .join(" | ");

        if (!key) continue;

        const already = existingEdu.some((ex: any) => {
          const exKey = [
            (ex.institution || "").trim(),
            (ex.degree || "").trim(),
            (ex.fieldOfStudy || "").trim(),
          ]
            .filter(Boolean)
            .join(" | ");
          return exKey === key;
        });

        if (!already) {
          existingEdu.push({
            institution: e.institution || "",
            degree: e.degree || "",
            fieldOfStudy: e.fieldOfStudy || "",
            graduationDate: e.graduationDate || "",
          });
        }
      }

      (next as any).education = existingEdu;
    }

    // --- merge project suggestions into resume projects ---
    if (Array.isArray((candidate as any).projects)) {
      const incomingProjects = (candidate as any).projects as Array<{
        name?: string;
        technologies?: string;
        outcomes?: string;
        startDate?: string;
        endDate?: string;
        role?: string;
      }>;

      const existingProjects = Array.isArray((next as any).projects)
        ? [...(next as any).projects]
        : [];

      for (const p of incomingProjects) {
        const key = (p.name || "").trim();
        if (!key) continue;

        const already = existingProjects.some(
          (ex: any) => (ex.name || "").trim() === key
        );

        if (!already) {
          existingProjects.push({
            name: p.name || "",
            technologies: p.technologies || "",
            outcomes: p.outcomes || "",
            startDate: p.startDate || "",
            endDate: p.endDate || "",
            role: p.role || "",
          });
        }
      }

      (next as any).projects = existingProjects;
    }

    // Summary suggestion – only if we don’t already have one
    if (
      (!next.summary || !String(next.summary).trim()) &&
      Array.isArray(candidate.summarySuggestions) &&
      candidate.summarySuggestions.length > 0
    ) {
      next.summary = candidate.summarySuggestions[0];
    }

    return next;
  });
}
  async function runAiWithJob(jobOrDraft: Job | JobDraft) {
    try {
      setAiError(null);
      setAiLoading(true);

      const user = safeGetUser();
      console.log(
        "[AI] Calling GetAiResumeContent with job/draft:",
        jobOrDraft
      );

      const result: any = await GetAiResumeContent({
        userid: user._id,
        Jobdata: jobOrDraft,
      });

      // 🔍 Log raw AI result
      console.log("[AI] Raw GetAiResumeContent result:", result);

      const arr: AiResumeCandidate[] =
        result && Array.isArray(result.parsedCandidates)
          ? (result.parsedCandidates as AiResumeCandidate[])
          : result?.data
          ? [result.data as AiResumeCandidate]
          : [];

      // 🔍 Log parsed candidates + first candidate’s experience bullets
      console.log("[AI] Parsed candidates array:", arr);
      if (arr[0]) {
        console.log(
          "[AI] First candidate experienceBullets:",
          arr[0].experienceBullets
        );
      }

      if (arr.length > 0) {
        setAiVars(arr);
        setAiIdx(0);
        // 🔍 Log before applying the first candidate
        console.log("[AI] Applying first candidate:", arr[0]);
        applyAiCandidate(arr[0]);
      } else {
        setAiVars([]);
        setAiError("AI did not return any candidates.");
        console.warn("[AI] No candidates returned from GetAiResumeContent");
      }
    } catch (e: any) {
      console.error("[AI] Error from GetAiResumeContent:", e);
      setAiError(e?.message ?? "AI generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  const handlePrevAiVariant = () => {
    setAiIdx((idx) =>
      aiVars.length === 0 ? 0 : (idx - 1 + aiVars.length) % aiVars.length
    );
  };

  const handleNextAiVariant = () => {
    setAiIdx((idx) => (aiVars.length === 0 ? 0 : (idx + 1) % aiVars.length));
  };

  const handleClickGenerateWithAI = () => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { flash: "Please log in to use AI resume suggestions." },
      });
      return;
    }
    setAiError(null);
    setShowJobPicker(true);
  };

  const handlePickJob = async (job: Job) => {
    setShowJobPicker(false);
    await runAiWithJob(job);
  };

  const handleEnterJobManual = () => {
    setShowJobPicker(false);
    setShowMiniForm(true);
  };

  const handleMiniFormSubmit = async (draft: JobDraft) => {
    setShowMiniForm(false);
    await runAiWithJob(draft);
  };

  /* JSX */

  const contact = (data.contact || {}) as ContactInfo;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      {/* TOP: Title + primary actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left: Title & subtitle */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Edit Resume – {template.key.toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fine-tune your resume content, run checks, and export to multiple
            formats.
          </p>
        </div>

        {/* Right: Filename + primary buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end">
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm sm:w-44"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename"
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={handleRunValidation}
              className="text-xs px-3 py-1"
            >
              Run Checks
            </Button>
            <Button
              type="button"
              onClick={handleClickGenerateWithAI}
              className="text-xs px-3 py-1"
            >
              Regenerate with AI
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs px-3 py-1"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndBack}
              className="text-xs px-3 py-1"
            >
              Save &amp; Back
            </Button>
            {resumeId && (
              <Button
                type="button"
                onClick={() => setShowCreateVersionModal(true)}
                className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700"
              >
                Create Version
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SECOND ROW: Sharing, review progress, status, feedback */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Share + review progress */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => setShowShareSettings(true)}
            disabled={!resumeId}
            className="text-xs px-3 py-1"
          >
            Share
          </Button>

          <MiniReviewProgress
            reviewers={reviewers}
            reviewDeadline={shareDeadline || undefined}
          />
        </div>

        {/* Right: Status controls + feedback summary */}
        <div className="flex flex-col items-start gap-2 md:items-end">
          {/* Current status pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            <button
              type="button"
              disabled={updatingWorkflow || !resumeId}
              className={`
            inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs
            ${
              workflowStatus === "approved"
                ? "bg-green-50 border-green-200 text-green-700"
                : workflowStatus === "in_review"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : workflowStatus === "changes_requested"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-gray-50 border-gray-200 text-gray-700"
            }
          `}
            >
              <span className="capitalize">
                {workflowStatus.replace("_", " ")}
              </span>
              {!updatingWorkflow && <span className="text-[10px]">▼</span>}
              {updatingWorkflow && (
                <span className="text-[10px] text-gray-400">…</span>
              )}
            </button>
          </div>

          {/* Quick status buttons + approved info + feedback summary */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span className="mr-1">Quick status:</span>

            <button
              type="button"
              className={`rounded border px-2 py-1 ${
                workflowStatus === "draft"
                  ? "border-gray-400"
                  : "border-gray-200"
              }`}
              onClick={() => handleChangeWorkflowStatus("draft")}
              disabled={updatingWorkflow || !resumeId}
            >
              Draft
            </button>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${
                workflowStatus === "in_review"
                  ? "border-blue-400"
                  : "border-gray-200"
              }`}
              onClick={() => handleChangeWorkflowStatus("in_review")}
              disabled={updatingWorkflow || !resumeId}
            >
              In review
            </button>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${
                workflowStatus === "changes_requested"
                  ? "border-amber-400"
                  : "border-gray-200"
              }`}
              onClick={() => handleChangeWorkflowStatus("changes_requested")}
              disabled={updatingWorkflow || !resumeId}
            >
              Changes requested
            </button>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${
                workflowStatus === "approved"
                  ? "border-green-500"
                  : "border-gray-200"
              }`}
              onClick={() => handleChangeWorkflowStatus("approved")}
              disabled={updatingWorkflow || !resumeId}
            >
              Approved
            </button>

            {workflowStatus === "approved" && approvedByName && (
              <span className="ml-2 text-[10px] text-green-700">
                Approved by {approvedByName}
                {approvedAt &&
                  ` on ${new Date(approvedAt).toLocaleDateString()}`}
              </span>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenFeedbackSummary}
              disabled={!resumeId}
              className="ml-auto text-xs px-3 py-1"
            >
              Feedback summary
            </Button>
          </div>
        </div>
      </div>

      {/* STATUS MESSAGES */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {lastSaved && (
        <div className="text-xs text-gray-500">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </div>
      )}

      {showShareSettings && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Share cover letter</h3>
                <p className="text-xs text-gray-500">
                  Control who can see this and invite people directly.
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-700 transition"
                onClick={() => setShowShareSettings(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Slider / Tabs */}
            <div className="mb-4">
              <div className="inline-flex items-center rounded-full bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setShareTab("settings")}
                  className={`px-3 py-1 rounded-full transition ${
                    shareTab === "settings"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Share settings
                </button>
                <button
                  type="button"
                  onClick={() => setShareTab("people")}
                  className={`px-3 py-1 rounded-full transition ${
                    shareTab === "people"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Who I’m sharing with
                </button>
              </div>
            </div>

            {/* TAB: Share settings */}
            {shareTab === "settings" && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Choose who can access this shared link and whether they can
                  leave comments.
                </p>

                {/* Visibility */}
                <div className="mb-4">
                  <div className="text-sm font-medium mb-1">Visibility</div>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shareVisibility"
                        value="public"
                        checked={shareVisibility === "public"}
                        onChange={() => setShareVisibility("public")}
                        className="mt-[3px]"
                      />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-gray-500">
                          Anyone with the link can view.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shareVisibility"
                        value="unlisted"
                        checked={shareVisibility === "unlisted"}
                        onChange={() => setShareVisibility("unlisted")}
                        className="mt-[3px]"
                      />
                      <div>
                        <div className="font-medium">Unlisted</div>
                        <div className="text-xs text-gray-500">
                          Only people you send the link to can view.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shareVisibility"
                        value="restricted"
                        checked={shareVisibility === "restricted"}
                        onChange={() => setShareVisibility("restricted")}
                        className="mt-[3px]"
                      />
                      <div>
                        <div className="font-medium">Restricted</div>
                        <div className="text-xs text-gray-500">
                          Only approved reviewers can view.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Allow comments */}
                <div className="mb-4">
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={shareAllowComments}
                      onChange={(e) => setShareAllowComments(e.target.checked)}
                      className="mt-[3px]"
                    />
                    <div>
                      <div className="font-medium">Allow comments</div>
                      <div className="text-xs text-gray-500">
                        Reviewers can leave feedback on this cover letter.
                      </div>
                    </div>
                  </label>
                </div>

                {/* NEW: Review deadline */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Review deadline{" "}
                    <span className="text-xs text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={shareDeadline}
                    onChange={(e) => setShareDeadline(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Let reviewers know when you’d like feedback by.
                  </p>
                </div>

                {/* Last shared URL (optional) */}
                {shareUrl && (
                  <div className="mb-4 text-xs text-gray-600 break-all bg-gray-50 border rounded px-3 py-2">
                    Last share link:{" "}
                    <span className="font-mono">{shareUrl}</span>
                  </div>
                )}
              </>
            )}

            {/* TAB: People / Invites */}
            {shareTab === "people" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Invite by email
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInvite}
                      disabled={!inviteEmail.trim() || shareLoading}
                      className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-60"
                    >
                      Add
                    </button>
                  </div>

                  {/* NEW: Role selector */}
                  <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Role</span>
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(
                            e.target.value as
                              | "mentor"
                              | "peer"
                              | "advisor"
                              | "recruiter"
                              | "other"
                          )
                        }
                        className="rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="mentor">Mentor</option>
                        <option value="peer">Peer</option>
                        <option value="advisor">Advisor</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* NEW: Permissions toggles */}
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteCanComment}
                        onChange={(e) => setInviteCanComment(e.target.checked)}
                        className="h-3 w-3"
                      />
                      <span className="text-gray-600">Can comment</span>
                    </label>

                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteCanResolve}
                        onChange={(e) => setInviteCanResolve(e.target.checked)}
                        className="h-3 w-3"
                      />
                      <span className="text-gray-600">
                        Can resolve comments
                      </span>
                    </label>
                  </div>

                  {inviteError && (
                    <p className="mt-1 text-xs text-red-500">{inviteError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    We’ll email them a link to view this cover letter with the
                    role and permissions you selected.
                  </p>
                </div>

                {/* UPDATED: People with access list uses invitedReviewers */}
                {invitedEmails.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      People with access
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invitedEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveInvite(email)}
                            className="text-gray-400 hover:text-gray-700"
                            aria-label={`Remove ${email}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-sm hover:bg-gray-200"
                onClick={() => setShowShareSettings(false)}
                disabled={shareLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-60 hover:bg-emerald-700"
                onClick={handleShareConfirm}
                disabled={shareLoading}
              >
                {shareLoading ? "Sharing…" : "Copy link & send invites"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: left editors, right theme + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: editors */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quality checks — now using ValidationPanel */}
          <ValidationPanel
            validation={validation}
            lastValidatedAt={lastValidatedAt}
            onRunChecks={handleRunValidation}
          />

          {/* AI suggestions panel */}
          {aiVars.length > 0 && activeCandidate && (
            <div className="border rounded-lg p-4 space-y-3 bg-indigo-50/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    AI suggestions — Summary, skills, and bullet points
                  </h2>
                  <p className="text-[11px] text-gray-600">
                    Browse AI-generated variations and apply the parts you like
                    to your resume.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600">
                      Variation {aiIdx + 1} of {aiVars.length}
                    </span>
                    <div className="inline-flex rounded border overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={handlePrevAiVariant}
                        className="px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={handleNextAiVariant}
                        className="px-2 py-1 text-xs hover:bg-gray-50 border-l"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                  {aiLoading && (
                    <span className="text-[11px] text-indigo-700">
                      Generating…
                    </span>
                  )}
                  {aiError && (
                    <span className="text-[11px] text-red-600">{aiError}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                {/* Suggested summary */}
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">
                    Suggested summary
                  </p>
                  {activeCandidate.summarySuggestions &&
                  activeCandidate.summarySuggestions.length > 0 ? (
                    activeCandidate.summarySuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="border rounded bg-white p-2 flex flex-col gap-2"
                      >
                        <p className="leading-snug">{s}</p>
                        <button
                          type="button"
                          onClick={() => replaceSummary(s)}
                          className="self-start px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Use
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">
                      No summary suggestions for this variation.
                    </p>
                  )}
                </div>

                {/* Suggested skills */}
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">
                    Suggested skills &amp; keywords
                  </p>
                  {combinedSkills.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1">
                        {combinedSkills.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              applyAiCandidate({
                                summarySuggestions: [],
                                skills: [s],
                                atsKeywords: [],
                                experienceBullets: [],
                              } as AiResumeCandidate)
                            }
                            className="px-2 py-1 rounded-full border bg-white hover:bg-emerald-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Click a chip to add that skill to your resume.
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">
                      No skill suggestions for this variation.
                    </p>
                  )}
                </div>

                {/* Suggested bullet points */}
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">
                    Suggested bullet points
                  </p>
                  {activeCandidate.experienceBullets &&
                  activeCandidate.experienceBullets.length > 0 ? (
                    <>
                      <ul className="list-disc ml-4 space-y-1 max-h-32 overflow-auto">
                        {activeCandidate.experienceBullets.flatMap(
                          (eb, ebIdx) =>
                            (eb.bullets || []).map((b, idx) => (
                              <li key={`${ebIdx}-${idx}`}>{b}</li>
                            ))
                        )}
                      </ul>
                      <button
                        type="button"
                        onClick={() => applyAiCandidate(activeCandidate)}
                        className="mt-2 px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Apply this variation
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">
                      No bullet suggestions for this variation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header + contact */}
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Header</h2>
            <div className="space-y-2">
              <label className="block text-xs text-gray-600">
                Full Name
                <input
                  type="text"
                  value={data.name || ""}
                  onChange={handleNameChange}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
            </div>

            <div className="flex items-center justify-between mt-4">
              <h3 className="text-xs font-semibold text-gray-700">
                Contact Info
              </h3>
              <button
                type="button"
                className="text-[11px] text-indigo-600 underline"
                onClick={() =>
                  loadContactFromProfile(
                    (c: ContactInfo, profileName?: string) =>
                      setData((d) => ({
                        ...d,
                        name:
                          d.name && d.name !== "Your Name"
                            ? d.name
                            : profileName || d.name,
                        contact: c,
                      })),
                    contact
                  )
                }
              >
                Load from profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <label className="block text-xs text-gray-600">
                Email
                <input
                  type="email"
                  value={contact.email || ""}
                  onChange={handleContactChange("email")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Phone
                <input
                  type="tel"
                  value={contact.phone || ""}
                  onChange={handleContactChange("phone")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Location
                <input
                  type="text"
                  value={contact.location || ""}
                  onChange={handleContactChange("location")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Website
                <input
                  type="text"
                  value={contact.website || ""}
                  onChange={handleContactChange("website")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-600">
                LinkedIn
                <input
                  type="text"
                  value={contact.linkedin || ""}
                  onChange={handleContactChange("linkedin")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-600">
                GitHub
                <input
                  type="text"
                  value={contact.github || ""}
                  onChange={handleContactChange("github")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>

          {/* Summary */}
          {visibleSectionIds.includes("summary") && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Summary</h2>
              </div>
              <textarea
                value={data.summary || ""}
                onChange={handleSummaryChange}
                rows={4}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="2–3 sentences highlighting who you are, your focus, and biggest strengths."
              />
            </div>
          )}

          {/* Skills */}
          {visibleSectionIds.includes("skills") && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Skills</h2>
              </div>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={skillsCsv(data)}
                onChange={handleSkillsChange}
                placeholder="e.g. React, TypeScript, Node.js, SQL"
              />
              <p className="text-[11px] text-gray-500">
                Separate skills with commas. We’ll turn them into individual
                tags in the preview.
              </p>
            </div>
          )}

          {/* Experience */}
          {visibleSectionIds.includes("experience") && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Experience
                </h2>
                <Button
                  type="button"
                  onClick={addExperience}
                  className="text-xs px-2 py-1"
                >
                  Add Role
                </Button>
              </div>
              {(data.experience || []).length === 0 && (
                <p className="text-xs text-gray-500">
                  Add internships, part-time roles, research, or other
                  experience that shows impact.
                </p>
              )}
              <div className="space-y-4">
                {(data.experience || []).map((exp: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-md p-3 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Role {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperience(idx)}
                        className="text-[11px] text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="block text-xs text-gray-600">
                        Job Title
                        <input
                          type="text"
                          value={exp.jobTitle || ""}
                          onChange={updateExperienceField(idx, "jobTitle")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Company
                        <input
                          type="text"
                          value={exp.company || ""}
                          onChange={updateExperienceField(idx, "company")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Location
                        <input
                          type="text"
                          value={exp.location || ""}
                          onChange={updateExperienceField(idx, "location")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Start (YYYY-MM)
                        <input
                          type="text"
                          value={exp.startDate || ""}
                          onChange={updateExperienceField(idx, "startDate")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        End (YYYY-MM or Present)
                        <input
                          type="text"
                          value={exp.endDate || ""}
                          onChange={updateExperienceField(idx, "endDate")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                    </div>
                    <label className="block text-xs text-gray-600">
                      Highlights (one per line)
                      <textarea
                        rows={3}
                        value={(exp.highlights || []).join("\n")}
                        onChange={updateExperienceField(idx, "highlights")}
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {visibleSectionIds.includes("education") && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Education
                </h2>
                <Button
                  type="button"
                  onClick={addEducation}
                  className="text-xs px-2 py-1"
                >
                  Add School
                </Button>
              </div>
              {(data.education || []).length === 0 && (
                <p className="text-xs text-gray-500">
                  Include degree, institution, and expected / actual graduation
                  date.
                </p>
              )}
              <div className="space-y-4">
                {(data.education || []).map((ed: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-md p-3 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Education {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEducation(idx)}
                        className="text-[11px] text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="block text-xs text-gray-600">
                        Institution
                        <input
                          type="text"
                          value={ed.institution || ""}
                          onChange={updateEducationField(idx, "institution")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Degree
                        <input
                          type="text"
                          value={ed.degree || ""}
                          onChange={updateEducationField(idx, "degree")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Field of Study
                        <input
                          type="text"
                          value={ed.fieldOfStudy || ""}
                          onChange={updateEducationField(idx, "fieldOfStudy")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Graduation (YYYY-MM)
                        <input
                          type="text"
                          value={ed.graduationDate || ""}
                          onChange={updateEducationField(idx, "graduationDate")}
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {visibleSectionIds.includes("projects") && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Projects
                </h2>
                <Button
                  type="button"
                  onClick={addProject}
                  className="text-xs px-2 py-1"
                >
                  Add Project
                </Button>
              </div>
              {(data.projects || []).length === 0 && (
                <p className="text-xs text-gray-500">
                  Include personal, academic, or work projects that prove your
                  skills.
                </p>
              )}
              <div className="space-y-4">
                {(data.projects || []).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-md p-3 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Project {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(idx)}
                        className="text-[11px] text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block text-xs text-gray-600">
                      Name
                      <input
                        type="text"
                        value={p.name || ""}
                        onChange={updateProjectField(idx, "name")}
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="block text-xs text-gray-600">
                      Technologies
                      <input
                        type="text"
                        value={p.technologies || ""}
                        onChange={updateProjectField(idx, "technologies")}
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="block text-xs text-gray-600">
                      Outcomes / Impact
                      <textarea
                        rows={3}
                        value={p.outcomes || ""}
                        onChange={updateProjectField(idx, "outcomes")}
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections list */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Sections &amp; Order
            </h2>
            <p className="text-[11px] text-gray-500 mb-1">
              Drag to reorder sections. Use the checkboxes to hide/show in the
              preview and exports.
            </p>
            <div className="space-y-2">
              {draggableSections.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => handleDragStart(s.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(s.id)}
                  className={`flex items-center justify-between border rounded px-2 py-1 text-xs cursor-move ${
                    draggingId === s.id ? "bg-indigo-50 border-indigo-300" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => toggleSectionEnabled(s.id)}
                    />
                    <span className="font-medium text-gray-700">{s.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">drag</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div className="border rounded-lg p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-800">Export</h2>
            <p className="text-[11px] text-gray-500">
              Export your current resume in different formats.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleExport("pdf")}
                className="text-xs px-3 py-1"
              >
                Export PDF
              </Button>
              <Button
                type="button"
                onClick={() => handleExport("docx")}
                className="text-xs px-3 py-1"
              >
                Export Word (.docx)
              </Button>
              <Button
                type="button"
                onClick={() => handleExport("txt")}
                className="text-xs px-3 py-1"
              >
                Plain Text
              </Button>
              <Button
                type="button"
                onClick={() => handleExport("html")}
                className="text-xs px-3 py-1"
              >
                HTML
              </Button>
              <Button
                type="button"
                onClick={() => handleExport("json")}
                className="text-xs px-3 py-1"
              >
                JSON
              </Button>
            </div>
            <p className="text-[11px] text-gray-500">
              You can also download a PDF directly from the preview panel.
            </p>
          </div>
        </div>

        {/* Right: theme + preview */}
        <div className="space-y-4">
          {/* Theme chooser */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Theme &amp; Layout
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeKey(key as ThemeKey)}
                  className={`px-2 py-1 rounded text-xs border ${
                    key === themeKey
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              Themes change typography and spacing in both preview and exports.
            </p>
          </div>

          {/* Live preview + direct PDF download */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <span className="text-xs font-medium text-gray-700">
                Live Preview
              </span>
              <PDFDownloadLink
                document={<PdfComp data={data} />}
                fileName={`${filename || "resume"}.pdf`}
              >
                {({ loading }) => (
                  <Button type="button" className="text-xs px-3 py-1">
                    {loading ? "Preparing PDF…" : "Download PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
            <div className="p-3 max-h-[70vh] overflow-auto bg-gray-100">
              <Suspense
                fallback={
                  <div className="text-xs text-gray-500">Loading preview…</div>
                }
              >
                <div className="bg-white shadow-sm">
                  <Preview
                    data={previewData}
                    onEdit={() => {}}
                    visibleSections={visibleSectionIds}
                    sectionOrder={draggableSections.map((s) => s.id)}
                    theme={theme}
                  />
                </div>
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Job picker sheet for AI */}
      <JobPickerSheet
        open={showJobPicker}
        onClose={() => setShowJobPicker(false)}
        jobs={jobs || []}
        loading={jobsLoading}
        error={jobsError}
        onPickJob={handlePickJob}
        onEnterManual={handleEnterJobManual}
      />

      {/* Mini job form for AI */}
      <MiniJobForm
        open={showMiniForm}
        onCancel={() => setShowMiniForm(false)}
        onSubmit={(draft) => {
          void handleMiniFormSubmit(draft);
        }}
      />

      {/* Feedback summary modal */}
      <Modal
        open={feedbackSummaryOpen}
        onClose={() => setFeedbackSummaryOpen(false)}
        title="Feedback summary"
      >
        {feedbackSummaryLoading && (
          <p className="text-sm text-gray-600">Loading feedback summary…</p>
        )}

        {feedbackSummaryError && (
          <div className="mb-3 text-sm text-red-600">
            {feedbackSummaryError}
            <div className="mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenFeedbackSummary}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {feedbackSummary &&
          !feedbackSummaryLoading &&
          !feedbackSummaryError && (
            <div className="space-y-4 text-sm max-h-[420px] overflow-y-auto pr-1">
              {/* Top stats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Reviewers</p>
                  <p className="font-semibold">
                    {feedbackSummary.totalReviewers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Comments</p>
                  <p className="font-semibold">
                    {feedbackSummary.totalComments}{" "}
                    <span className="text-[11px] text-gray-500">
                      ({feedbackSummary.resolvedComments} resolved)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Open comments</p>
                  <p className="font-semibold">
                    {feedbackSummary.openComments}
                  </p>
                </div>
              </div>

              {/* By-role breakdown */}
              {feedbackSummary.byRole?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    By reviewer role
                  </p>
                  <ul className="space-y-1">
                    {feedbackSummary.byRole.map((r) => (
                      <li
                        key={r.role}
                        className="flex justify-between gap-2 text-xs text-gray-600"
                      >
                        <span>
                          {r.role
                            ? r.role[0].toUpperCase() + r.role.slice(1)
                            : "Unknown"}
                        </span>
                        <span className="text-gray-500">
                          {r.reviewers} reviewers · {r.comments} comments (
                          {r.resolvedComments} resolved)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI summary */}
              {feedbackSummary.aiSummary && (
                <div className="space-y-3 border-t pt-3">
                  {feedbackSummary.aiSummary.themes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Key themes
                      </p>
                      <ul className="space-y-2">
                        {feedbackSummary.aiSummary.themes.map((theme, idx) => (
                          <li
                            key={idx}
                            className="border rounded-md p-2 bg-gray-50"
                          >
                            <p className="text-xs font-semibold">
                              {theme.label}
                              {typeof theme.frequency === "number" &&
                                theme.frequency > 0 && (
                                  <span className="ml-1 text-[10px] text-gray-500">
                                    · {theme.frequency} mentions
                                  </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {theme.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSummary.aiSummary.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Strengths reviewers highlighted
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {feedbackSummary.aiSummary.strengths.map((s, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSummary.aiSummary.improvementSuggestions?.length >
                    0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Suggested improvements
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {feedbackSummary.aiSummary.improvementSuggestions.map(
                          (s, idx) => (
                            <li key={idx} className="text-xs text-gray-600">
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </Modal>

      {/* Create Version Modal */}
      {showCreateVersionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Create Resume Version
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Version Name
              </label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={`Version ${new Date().toLocaleDateString()}`}
                className="w-full border rounded px-3 py-2"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                This will create a snapshot of your current resume
              </p>
            </div>

            {versions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                <p className="font-medium mb-1">Existing Versions:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {versions.slice(0, 3).map((v) => (
                    <li key={v._id}>
                      • {v.name} ({new Date(v.createdAt).toLocaleDateString()})
                    </li>
                  ))}
                  {versions.length > 3 && (
                    <li className="text-gray-400">
                      ... and {versions.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateVersionModal(false);
                  setVersionName("");
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                disabled={creatingVersion}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={creatingVersion || !versionName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {creatingVersion ? "Creating..." : "Create Version"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeEditor;
