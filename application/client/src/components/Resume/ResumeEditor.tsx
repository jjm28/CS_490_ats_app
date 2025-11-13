// src/components/Resume/ResumeEditor.tsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import {
  resumePreviewRegistry,
  resumePdfRegistry,
} from "../../components/Resume";
import type { ResumeData, TemplateKey } from "../../api/resumes";
import {
  saveResume,
  updateResume,
  getFullResume,
  createSharedResume,
  GetAiResumeContent,
  fetchResumeVersions,
  fetchResumeVersion,
  createResumeVersionNew,
  updateResumeVersionContent, // save version content / rename (PATCH :id)
  // NEW API helpers you should expose in ../../api/resumes (simple fetch wrappers to your existing endpoints):
  setDefaultResumeVersion,       // POST /api/resume-versions/:id/set-default
  patchResumeVersionMeta,        // PATCH /api/resume-versions/:id  (status, description, linkJobIds, etc.)
  deleteResumeVersionById,       // DELETE /api/resume-versions/:id
  compareResumeVersions,         // POST /api/resume-versions/compare
  mergeResumeVersions,           // POST /api/resume-versions/merge
} from "../../api/resumes";

import JobPickerSheet from "../Resume/JobPickerSheet";
import MiniJobForm, { type JobDraft } from "../Resume/MiniJobForm";
import { useJobs, type Job } from "./hooks/useJobs";

/* ---------- Types ---------- */

type AiResumeCandidate = {
  summarySuggestions?: string[];
  skills?: string[];
  atsKeywords?: string[];
  experienceBullets?: Array<{
    sourceExperienceIndex: number;
    company: string;
    jobTitle: string;
    bullets: string[];
  }>;
};

type LocationState = {
  ResumeId?: string | null;
  template: { key: TemplateKey; title?: string };
  resumeData?: {
    filename: string;
    templateKey: TemplateKey;
    resumedata: ResumeData;
    lastSaved: string | null;
  };
  AImode?: boolean;
  AiResume?: {
    parsedCandidates?: AiResumeCandidate[];
    data?: AiResumeCandidate;
  };
};

type SectionKey =
  | "header"
  | "summary"
  | "skills:add"
  | "experience:add"
  | "experience:edit"
  | "education:add"
  | "education:edit"
  | "project:add"
  | "project:edit";

type AnyIndex = { idx: number } | null;

type ResumeVersionLite = {
  _id: string;
  name: string;
  createdAt?: string;
  isDefault?: boolean;
};
// ---------- Validation Types & Helpers ----------

type ValidationIssueType =
  | "missing-info"
  | "length"
  | "format"
  | "contact"
  | "tone"
  | "spell-grammar";

type ValidationSeverity = "info" | "warning" | "error";

type ValidationIssue = {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  message: string;
  field?: string;
};

type ValidationSummary = {
  issues: ValidationIssue[];
  wordCount: number;
  estimatedPages: number;
  tone: "professional" | "mixed" | "informal";
  contactOk: boolean;
  hasMissingInfo: boolean;
};

function collectTextFromResume(data: ResumeData): string {
  const chunks: string[] = [];

  if (data.name) chunks.push(String(data.name));
  if (data.summary) chunks.push(String(data.summary));

  (data.experience || []).forEach((exp: any) => {
    if (exp.company) chunks.push(String(exp.company));
    if (exp.jobTitle) chunks.push(String(exp.jobTitle));
    if (exp.location) chunks.push(String(exp.location));
    if (Array.isArray(exp.highlights)) {
      chunks.push(exp.highlights.join(" "));
    }
  });

  (data.education || []).forEach((ed: any) => {
    if (ed.institution) chunks.push(String(ed.institution));
    if (ed.degree) chunks.push(String(ed.degree));
    if (ed.fieldOfStudy) chunks.push(String(ed.fieldOfStudy));
  });

  (data.projects || []).forEach((p: any) => {
    if (p.name) chunks.push(String(p.name));
    if (p.technologies) chunks.push(String(p.technologies));
    if (p.outcomes) chunks.push(String(p.outcomes));
  });

  (data.skills || []).forEach((s: any) => {
    const name = typeof s === "string" ? s : s?.name;
    if (name) chunks.push(String(name));
  });

  return chunks.filter(Boolean).join(" ");
}

function runResumeValidation(data: ResumeData): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const text = collectTextFromResume(data);
  const trimmed = text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const estimatedPages = Math.max(1, Math.round(wordCount / 500)); // ~500 words/page

  // ----- Length optimization -----
  if (estimatedPages > 2) {
    issues.push({
      type: "length",
      severity: "warning",
      message:
        "Resume may be too long. Aim for 1–2 pages by tightening bullets and removing older or less relevant roles.",
    });
  } else if (wordCount < 200) {
    issues.push({
      type: "length",
      severity: "info",
      message:
        "Resume looks very short. Consider adding more detail on impact, metrics, and relevant experience.",
    });
  }

  // ----- Missing info -----
  if (!data.summary || !String(data.summary).trim()) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "summary",
      message:
        "Summary is empty. Add a 2–3 sentence summary emphasizing your role, focus, and key strengths.",
    });
  }

  if (!data.experience || data.experience.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "experience",
      message: "No experience entries. Add internships, projects, or roles to show your impact.",
    });
  } else {
    (data.experience || []).forEach((exp: any, idx: number) => {
      if (!exp.company || !exp.jobTitle || !exp.startDate) {
        issues.push({
          type: "missing-info",
          severity: "warning",
          field: `experience[${idx}]`,
          message:
            "Each experience should have a company, job title, and start date. Some entries are incomplete.",
        });
      }
      if (!exp.highlights || exp.highlights.length === 0) {
        issues.push({
          type: "missing-info",
          severity: "info",
          field: `experience[${idx}].highlights`,
          message: "Add 2–5 bullet points for each experience to describe your impact.",
        });
      }
    });
  }

  if (!data.education || data.education.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "education",
      message: "No education entries. Add your degree, institution, and expected graduation date.",
    });
  }

  if (!data.skills || data.skills.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "skills",
      message: "No skills listed. Add your core technical and relevant tools (e.g., React, Node, SQL).",
    });
  }

  // ----- Format consistency (simple) -----
  const dateRegex = /^\d{4}-\d{2}/; // YYYY-MM
  const checkDate = (value: string | null | undefined, field: string) => {
    if (!value) return;
    if (!dateRegex.test(value)) {
      issues.push({
        type: "format",
        severity: "info",
        field,
        message: `Date "${value}" is not in a consistent YYYY-MM format. Use a single format across the resume.`,
      });
    }
  };

  (data.experience || []).forEach((exp: any, idx: number) => {
    checkDate(exp.startDate, `experience[${idx}].startDate`);
    if (exp.endDate) checkDate(exp.endDate, `experience[${idx}].endDate`);
  });

  (data.education || []).forEach((ed: any, idx: number) => {
    checkDate(ed.graduationDate, `education[${idx}].graduationDate`);
  });

  // ----- Contact info validation -----
  const anyData: any = data as any;
  const email: string | undefined =
    anyData.email || anyData.contact?.email || anyData.header?.email;
  const phone: string | undefined =
    anyData.phone || anyData.contact?.phone || anyData.header?.phone;
  const location: string | undefined =
    anyData.location || anyData.contact?.location || anyData.header?.location;

  let contactOk = true;
  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /^[0-9+()\-.\s]{7,}$/;

  if (!email && !phone && !location) {
    contactOk = false;
    issues.push({
      type: "contact",
      severity: "error",
      message:
        "No contact information detected. Include at least email and phone so recruiters can reach you.",
    });
  } else {
    if (email && !emailRegex.test(email)) {
      contactOk = false;
      issues.push({
        type: "contact",
        severity: "warning",
        field: "email",
        message:
          "Email format looks unusual. Make sure it’s a valid address (e.g., yourname@domain.com).",
      });
    }
    if (phone && !phoneRegex.test(phone)) {
      contactOk = false;
      issues.push({
        type: "contact",
        severity: "info",
        field: "phone",
        message:
          "Phone number may be missing country code or separators. Ensure it’s easy to dial internationally.",
      });
    }
  }

  // ----- Tone & basic spell/grammar-ish checks -----
  const lower = trimmed.toLowerCase();
  const slangWords = ["lol", "lmao", "omg", "bro", "dude", "hella", "kinda", "sorta"];
  let slangHits = 0;

  slangWords.forEach((w) => {
    if (lower.includes(` ${w} `) || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`)) {
      slangHits++;
      issues.push({
        type: "tone",
        severity: "warning",
        message: `Informal word "${w}" detected. Replace slang with professional language.`,
      });
    }
  });

  if (/[!?]{2,}/.test(trimmed)) {
    issues.push({
      type: "tone",
      severity: "info",
      message:
        "Multiple exclamation/question marks found. Keep punctuation neutral and professional.",
    });
  }

  if (/\bi\b(?![a-zA-Z])/g.test(trimmed)) {
    issues.push({
      type: "spell-grammar",
      severity: "info",
      message: 'First-person "I" should be capitalized if you choose to use it.',
    });
  }

  if (/\s{2,}/.test(trimmed)) {
    issues.push({
      type: "format",
      severity: "info",
      message: "Double spaces detected. Clean up extra spaces for a polished look.",
    });
  }

  // classify tone
  let tone: "professional" | "mixed" | "informal" = "professional";
  if (slangHits > 1 || /[!?]{2,}/.test(trimmed)) {
    tone = "informal";
  } else if (slangHits === 1) {
    tone = "mixed";
  }

  const hasMissingInfo = issues.some((i) => i.type === "missing-info");

  // note: we can’t do full spell/grammar like Grammarly here, but we at least surface obvious issues
  if (!trimmed) {
    // if literally empty, make that clear
    issues.push({
      type: "missing-info",
      severity: "error",
      message: "Resume content is empty. Add sections before exporting.",
    });
  }

  return {
    issues,
    wordCount,
    estimatedPages,
    tone,
    contactOk,
    hasMissingInfo,
  };
}


/* ---------- Helpers ---------- */

function skillNamesToObjects(input: string): Array<{ name: string }> {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function skillsCsv(data: ResumeData) {
  return Array.isArray(data.skills)
    ? data.skills
        .map((s: any) => (typeof s === "string" ? s : s?.name))
        .filter(Boolean)
        .join(", ")
    : "";
}

/* ---------- Component ---------- */

export default function ResumeEditor() {
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;

  const template = state?.template;
  const initialId = state?.ResumeId ?? null;
  const initialPayload = state?.resumeData;

  // base defaults used when no resume payload exists
  const baseDefaults: ResumeData = {
    name: "Your Name",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    style: {
      color: { primary: "#111827" },
      font: { family: "Sans" },
      layout: { columns: 1 },
    },
  };

  // ai handling: optional initial injection
  let aiInjectedData: ResumeData | null = null;
  if (state?.AImode && state?.AiResume) {
    const ai = state.AiResume;
    const rawCandidate: Partial<ResumeData> | null =
      Array.isArray(ai.parsedCandidates) && ai.parsedCandidates.length > 0
        ? (ai.parsedCandidates[0] as unknown as Partial<ResumeData>)
        : ai.data
        ? (ai.data as unknown as Partial<ResumeData>)
        : null;

    if (rawCandidate) {
      aiInjectedData = { ...baseDefaults, ...rawCandidate };
    }
  }

  useEffect(() => {
    if (!template) navigate("/resumes", { replace: true });
  }, [template, navigate]);
  if (!template) return null;

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
  const [error, setErr] = useState<string | null>(null);

  const { jobs, loading: jobsLoading, err: jobsError, isLoggedIn } = useJobs();

  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [versions, setVersions] = useState<ResumeVersionLite[] | null>(null);
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null);

  // version context
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [currentVersionName, setCurrentVersionName] = useState<string | null>(
    null
  );
  const [renamingVersion, setRenamingVersion] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  // Create-version modal state
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [sourceChoice, setSourceChoice] = useState<"default" | "existing">(
    "default"
  );
  const [existingSourceId, setExistingSourceId] = useState<string>("");
  const [linkingVersionId, setLinkingVersionId] = useState<string | null>(null);

  // Compare & merge state
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparePayload, setComparePayload] = useState<{
    left?: string;
    right?: string;
  }>({});
  const [diff, setDiff] = useState<any | null>(null);
  const [mergeChoiceSummary, setMergeChoiceSummary] = useState<
    "base" | "right" | "custom"
  >("right");
  const [mergeCustomSummary, setMergeCustomSummary] = useState("");
  const [mergeChoiceSkills, setMergeChoiceSkills] = useState<
    "base" | "right" | "union"
  >("union");
  const [mergeChoiceExp, setMergeChoiceExp] = useState<Record<string, "base" | "right" | "custom">>({});
  const [mergeCustomExp, setMergeCustomExp] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);
// --- sharing state ---
const [showShareSettings, setShowShareSettings] = useState(false);
const [shareVisibility, setShareVisibility] = useState<
  "public" | "unlisted" | "restricted"
>("unlisted");
const [shareAllowComments, setShareAllowComments] = useState(true);
const [shareLoading, setShareLoading] = useState(false);
const [shareUrl, setShareUrl] = useState<string | null>(null);

  const safeGetUser = () => {
    const raw = localStorage.getItem("authUser");
    if (!raw) throw new Error("Not signed in (authUser missing).");
    const parsed = JSON.parse(raw);
    const u = parsed.user || parsed;
    if (!u?._id) throw new Error("authUser is missing _id.");
    return u;
  };
  useEffect(() => {
    const v = runResumeValidation(data);
    setValidation(v);
    // We don't update lastValidatedAt here so the "Last checked" label reflects manual checks
  }, [data]);

  // reload by id on hard refresh; also load versions list
  useEffect(() => {
    (async () => {
      if (!resumeId) return;
      try {
        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
        if (!uid) throw new Error("Missing user session");

        const full = await getFullResume({ userid: uid, resumeid: resumeId });
        setFilename(full.filename || "Untitled");
        setData(full.resumedata || data);
        setLastSaved(full.lastSaved || null);

        // We're editing base resume now (not a version)
        setCurrentVersionId(null);
        setCurrentVersionName(null);
        setRenamingVersion(false);

        try {
          const v = await fetchResumeVersions({ userid: uid, resumeid: resumeId });
          setVersions(v?.items || []);
          setDefaultVersionId(v?.defaultVersionId || null);
        } catch {
          // optional: ignore
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to reload resume.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const Preview = useMemo(
    () => resumePreviewRegistry[template.key],
    [template.key]
  );
  const PdfComp = useMemo(
    () => resumePdfRegistry[template.key],
    [template.key]
  );
  const pdfDoc = useMemo(() => <PdfComp data={data} />, [PdfComp, data]);

  function openCreateVersion() {
    setShowCreateVersion(true);
    setSourceChoice("default");
    setExistingSourceId("");
  }

  // Create version confirm
  async function handleCreateVersionConfirm() {
    try {
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid || !resumeId) throw new Error("Missing session or resume id");

      const payload = {
        userid: uid,
        resumeid: resumeId!,
        sourceVersionId: sourceChoice === "default" ? null : existingSourceId || null,
        name: `Version ${new Date().toLocaleDateString()}`,
        description: sourceChoice === "default" ? "Cloned from default" : "Cloned from existing",
      };

      const created = await createResumeVersionNew(payload);

      // Refresh versions
      const v = await fetchResumeVersions({ userid: uid, resumeid: resumeId });
      setVersions(v?.items || []);
      setDefaultVersionId(v?.defaultVersionId || null);

      setShowCreateVersion(false);

      // Immediately load the created version content into editor
      const createdFull = await fetchResumeVersion({ userid: uid, versionid: created._id });
      if (createdFull?.content) {
        setData(createdFull.content);
        setFilename(created?.name || filename);
        setCurrentVersionId(created._id);
        setCurrentVersionName(created?.name || null);
        setRenamingVersion(false);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to create version");
    }
  }

  /* ---------- Edit State ---------- */

  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [targetIndex, setTargetIndex] = useState<AnyIndex>(null);

  /* ---------- List Mutators ---------- */

  // Experience
  function addExperience(item: any) {
    setData((d) => ({
      ...d,
      experience: [...(d.experience || []), item],
    }));
  }
  function updateExperience(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.experience || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, experience: arr };
    });
  }
  function removeExperience(idx: number) {
    setData((d) => {
      const arr = [...(d.experience || [])];
      arr.splice(idx, 1);
      return { ...d, experience: arr };
    });
  }

  // Education
  function addEducation(item: any) {
    setData((d) => ({
      ...d,
      education: [...(d.education || []), item],
    }));
  }
  function updateEducation(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.education || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, education: arr };
    });
  }
  function removeEducation(idx: number) {
    setData((d) => {
      const arr = [...(d.education || [])];
      arr.splice(idx, 1);
      return { ...d, education: arr };
    });
  }

  // Projects
  function addProject(item: any) {
    setData((d) => ({
      ...d,
      projects: [...(d.projects || []), item],
    }));
  }
  function updateProject(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.projects || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, projects: arr };
    });
  }
  function removeProject(idx: number) {
    setData((d) => {
      const arr = [...(d.projects || [])];
      arr.splice(idx, 1);
      return { ...d, projects: arr };
    });
  }

  // Skills
  function addSkill(name: string) {
    if (!name.trim()) return;
    setData((d) => ({
      ...d,
      skills: [...(d.skills || []), { name: name.trim() }],
    }));
  }
  function removeSkill(i: number) {
    setData((d) => {
      const arr = [...(d.skills || [])];
      arr.splice(i, 1);
      return { ...d, skills: arr };
    });
  }

  /* ---------- Forms ---------- */

  const EditorForm = () => {
    if (!editing) return null;

    // Header
    if (editing === "header") {
      const [name, setName] = useState(String(data.name || ""));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, name }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              Save
            </button>
          </div>
        </form>
      );
    }

    // Summary
    if (editing === "summary") {
      const [summary, setSummary] = useState(String(data.summary || ""));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, summary }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Summary</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-36"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              Save
            </button>
          </div>
        </form>
      );
    }

    // Skills: add via CSV
    if (editing === "skills:add") {
      const [csv, setCsv] = useState(skillsCsv(data));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, skills: skillNamesToObjects(csv) }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Skills (comma-separated)</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              Save
            </button>
          </div>
        </form>
      );
    }

    // Experience: add & edit share the same form
    if (editing === "experience:add" || editing === "experience:edit") {
      const idx = (targetIndex as AnyIndex)?.idx ?? -1;
      const initial =
        editing === "experience:edit" && data.experience && data.experience[idx]
          ? data.experience[idx]
          : {};
      const [company, setCompany] = useState(initial.company || "");
      const [jobTitle, setJobTitle] = useState(initial.jobTitle || "");
      const [startDate, setStartDate] = useState(initial.startDate || "");
      const [endDate, setEndDate] = useState(initial.endDate || "");
      const [location, setLocation] = useState(initial.location || "");
      const [highlights, setHighlights] = useState(
        Array.isArray(initial.highlights) ? initial.highlights.join("\n") : ""
      );

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const item = {
              company,
              jobTitle,
              startDate,
              endDate: endDate || null,
              location,
              highlights: (typeof highlights === "string" ? highlights : "")
                .split("\n")
                .map((h) => String(h).trim())
                .filter(Boolean),
            };
            if (editing === "experience:add") addExperience(item);
            else updateExperience(idx, item);
            setEditing(null);
            setTargetIndex(null);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Company</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Job Title</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Start</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">End (optional)</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM or blank"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Location (optional)</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Highlights (one per line)</span>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 h-28"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => {
                setEditing(null);
                setTargetIndex(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              {editing === "experience:add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      );
    }

    // Education: add & edit
    if (editing === "education:add" || editing === "education:edit") {
      const idx = (targetIndex as AnyIndex)?.idx ?? -1;
      const initial =
        editing === "education:edit" && data.education && data.education[idx]
          ? data.education[idx]
          : {};
      const [institution, setInstitution] = useState(initial.institution || "");
      const [degree, setDegree] = useState(initial.degree || "");
      const [fieldOfStudy, setFieldOfStudy] = useState(
        initial.fieldOfStudy || ""
      );
      const [graduationDate, setGraduationDate] = useState(
        initial.graduationDate || ""
      );

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const item = { institution, degree, fieldOfStudy, graduationDate };
            if (editing === "education:add") addEducation(item);
            else updateEducation(idx, item);
            setEditing(null);
            setTargetIndex(null);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Institution</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Degree</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Field of study</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Graduation date</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM"
                value={graduationDate}
                onChange={(e) => setGraduationDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => {
                setEditing(null);
                setTargetIndex(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              {editing === "education:add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      );
    }

    // Projects: add & edit
    const idx = (targetIndex as AnyIndex)?.idx ?? -1;
    const initial =
      editing === "project:edit" && data.projects && data.projects[idx]
        ? data.projects[idx]
        : {};
    const [name, setName] = useState(initial.name || "");
    const [technologies, setTechnologies] = useState(
      initial.technologies || ""
    );
    const [outcomes, setOutcomes] = useState(initial.outcomes || "");

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const item = { name, technologies, outcomes };
          if (editing === "project:add") addProject(item);
          else updateProject(idx, item);
          setEditing(null);
          setTargetIndex(null);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Project name</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Technologies</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Outcomes / notes</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-24"
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-100"
            onClick={() => {
              setEditing(null);
              setTargetIndex(null);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-emerald-600 text-white"
          >
            {editing === "project:add" ? "Add" : "Save"}
          </button>
        </div>
      </form>
    );
  };

  /* ---------- Actions ---------- */

  const handleSave = async () => {
    try {
      setErr(null);
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid) throw new Error("Missing user session");

      const ts = new Date().toISOString();

      // If editing a VERSION, save to version, not base resume
      if (currentVersionId) {
        await updateResumeVersionContent({
          userid: uid,
          versionid: currentVersionId,
          content: data,
          // name: currentVersionName || undefined, // uncomment to sync name each save
        });
        setLastSaved(ts);
        alert("Version updated.");
        return;
      }

      // Otherwise save base resume
      if (!resumeId) {
        const created = await saveResume({
          userid: uid,
          filename,
          templateKey: template.key,
          resumedata: data,
          lastSaved: ts,
        });
        setResumeId(created?._id || created?.resumeid || null);
        setLastSaved(ts);
        alert("Saved.");
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
        alert("Updated.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Save failed.");
    }
  };

  const handleSaveAndGoBack = async () => {
    await handleSave();
    navigate("/resumes");
  };

// OLD handleShare -> now a "confirm" based on settings
const handleShareConfirm = async () => {
  try {
    setShareLoading(true);
    setErr(null);

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
    });

    setShareUrl(out.url || null);
    await navigator.clipboard.writeText(out.url);
    alert("Share link copied to clipboard!");

    setShowShareSettings(false);
  } catch (e: any) {
    setErr(e?.message ?? "Share failed.");
  } finally {
    setShareLoading(false);
  }
};


  const handleExport = () => {
    const payload = {
      filename,
      templateKey: template.key,
      resumedata: { ...data },
      lastSaved,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentVersionName || filename || "resume").replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleRunValidation = () => {
    const v = runResumeValidation(data);
    setValidation(v);
    setLastValidatedAt(new Date().toISOString());
  };
  /* ---------- AI handling ---------- */

  const AImode = state?.AImode;
  const AiResume = state?.AiResume;

  const [aiVars, setAiVars] = useState<AiResumeCandidate[] | null>(null);
  const [aiIdx, setAiIdx] = useState(0);

  useEffect(() => {
    if (!AImode || !AiResume) return;
    const arr =
      AiResume.parsedCandidates && AiResume.parsedCandidates.length
        ? AiResume.parsedCandidates
        : AiResume.data
        ? [AiResume.data]
        : [];
    if (arr.length) {
      setAiVars(arr);
      setAiIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AImode, AiResume]);

  function applyAiCandidate(c: AiResumeCandidate) {
    setData((d) => {
      const next: ResumeData = { ...d };

      // 1) Ensure experience entries exist and attach bullets
      const exp = [...(next.experience || [])];
      for (const eb of c.experienceBullets || []) {
        const rawIdx = Number(eb.sourceExperienceIndex ?? -1);
        const idx = rawIdx >= 0 ? rawIdx : exp.length;

        if (!exp[idx]) {
          exp[idx] = {
            company: eb.company || "",
            jobTitle: eb.jobTitle || "",
            startDate: "",
            endDate: null,
            location: "",
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
          highlights: existingHighlights,
        };
      }
      next.experience = exp;

      // 2) Merge skills
      const have = new Set(
        (next.skills || [])
          .map((s: any) => (typeof s === "string" ? s : s?.name))
          .filter(Boolean)
      );
      const incoming = [...(c.skills || []), ...(c.atsKeywords || [])];
      const toAdd = incoming.filter((s) => s && !have.has(s));
      next.skills = [...(next.skills || []), ...toAdd.map((name) => ({ name }))];

      // 3) Fill summary if empty
      if (
        (!next.summary || !String(next.summary).trim()) &&
        c.summarySuggestions &&
        c.summarySuggestions.length > 0
      ) {
        next.summary = c.summarySuggestions[0];
      }

      return next;
    });
  }

  function replaceSummary(s: string) {
    setData((d) => ({ ...d, summary: s }));
  }

  function handleRegenAI() {
    if (!isLoggedIn) {
      navigate("/login", { state: { flash: "Please log in to use AI." } });
      return;
    }
    setAiError(null);
    setLinkingVersionId(null);
    setShowJobPicker(true);
  }

  async function runAiWithJob(jobOrDraft: Job | JobDraft) {
    setAiError(null);
    setAiLoading(true);
    try {
      const user = safeGetUser();
      const ai = await GetAiResumeContent({
        userid: user._id,
        Jobdata: jobOrDraft,
      });

      const arr =
        (ai && Array.isArray(ai.parsedCandidates) && ai.parsedCandidates.length
          ? ai.parsedCandidates
          : ai?.data
          ? [ai.data]
          : []) as AiResumeCandidate[];

      if (arr.length) {
        setAiVars(arr);
        setAiIdx(0);
        const first = arr[0];
        applyAiCandidate(first);
        if (first.summarySuggestions && first.summarySuggestions.length > 0) {
          replaceSummary(first.summarySuggestions[0]);
        }
      }
    } catch (e: any) {
      setAiError(e?.message ?? String(e));
    } finally {
      setAiLoading(false);
    }
  }

  const handlePickJob = async (job: Job) => {
    setShowJobPicker(false);
      if (linkingVersionId) {
      try {
        const user = safeGetUser();

        await patchResumeVersionMeta({
          userid: user._id,
          versionid: linkingVersionId,
          linkJobIds: [job._id],
        });

        // optional: refresh versions so UI reflects the link
        if (resumeId) {
          const v = await fetchResumeVersions({
            userid: user._id,
            resumeid: resumeId,
          });
          setVersions(v?.items || []);
          setDefaultVersionId(v?.defaultVersionId || null);
        }

        alert("Linked this resume version to the selected job.");
      } catch (e: any) {
        alert(e?.message ?? "Failed to link job");
      } finally {
        setLinkingVersionId(null);
      }
      return;
    }
    await runAiWithJob(job);
  };
  const handleEnterJobManual = () => {
    setShowJobPicker(false);
      if (linkingVersionId) {
      setLinkingVersionId(null);
      return;
    }
    setShowMiniForm(true);
  };
  const handleMiniFormSubmit = async (draft: JobDraft) => {
    setShowMiniForm(false);
    await runAiWithJob(draft);
  };

  /* ---------- Versions helpers ---------- */

  function toggleCompareSelection(id: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep last + new
      return [...prev, id];
    });
  }

  async function handleSetDefault(vId: string) {
    try {
      const user = safeGetUser();
      await setDefaultResumeVersion({ userid: user._id, versionid: vId });
      if (resumeId) {
        const v = await fetchResumeVersions({ userid: user._id, resumeid: resumeId });
        setVersions(v?.items || []);
        setDefaultVersionId(v?.defaultVersionId || null);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to set default");
    }
  }

  async function handleArchive(vId: string) {
    try {
      const user = safeGetUser();
      await patchResumeVersionMeta({
        userid: user._id,
        versionid: vId,
        status: "archived",
      });
      if (resumeId) {
        const v = await fetchResumeVersions({ userid: user._id, resumeid: resumeId });
        setVersions(v?.items || []);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to archive");
    }
  }

  async function handleDelete(vId: string) {
    if (!confirm("Delete this version? This cannot be undone.")) return;
    try {
      const user = safeGetUser();
      await deleteResumeVersionById({ userid: user._id, versionid: vId });
      if (resumeId) {
        const v = await fetchResumeVersions({ userid: user._id, resumeid: resumeId });
        setVersions(v?.items || []);
        if (currentVersionId === vId) {
          // if we were editing it, fall back to base
          setCurrentVersionId(null);
          setCurrentVersionName(null);
          // reload base
          const full = await getFullResume({ userid: user._id, resumeid: resumeId });
          setFilename(full.filename || "Untitled");
          setData(full.resumedata || data);
        }
      }
    } catch (e: any) {
      alert(
        e?.message?.includes("default")
          ? "Cannot delete the default version."
          : e?.message ?? "Failed to delete"
      );
    }
  }

  async function openCompareModal() {
    if (selectedForCompare.length !== 2) {
      alert("Pick exactly two versions to compare.");
      return;
    }
    try {
      const user = safeGetUser();
      const [left, right] = selectedForCompare;
      const res = await compareResumeVersions({
        userid: user._id,
        leftVersionId: left,
        rightVersionId: right,
      });
      setDiff(res);
      setComparePayload({ left, right });
      // reset merge choices
      setMergeChoiceSummary("right");
      setMergeCustomSummary("");
      setMergeChoiceSkills("union");
      setMergeChoiceExp({});
      setMergeCustomExp({});
      setShowCompareModal(true);
    } catch (e: any) {
      alert(e?.message ?? "Compare failed");
    }
  }

  async function doMerge() {
    try {
      const user = safeGetUser();
      const resolution: Record<string, string> = {};

      // summary
      if (mergeChoiceSummary === "right") resolution.summary = "right";
      else if (mergeChoiceSummary === "custom")
        resolution.summary = `custom:${mergeCustomSummary}`;

      // skills
      if (mergeChoiceSkills === "right") resolution.skills = "right";
      else if (mergeChoiceSkills === "union") resolution.skills = "union";

      // experience
      (diff?.fields?.experience || []).forEach((e: any) => {
        const key = `experience[${e.index}].bullets`;
        const choice = mergeChoiceExp[key];
        if (!choice) return;
        if (choice === "right") resolution[key] = "right";
        else if (choice === "custom")
          resolution[key] = `custom:${(mergeCustomExp[key] || "").trim()}`;
      });

      const created = await mergeResumeVersions({
        userid: user._id,
        baseId: comparePayload.left!,       // treat left as base
        incomingId: comparePayload.right!,  // right overwrites when chosen
        name: `Merged ${new Date().toLocaleDateString()}`,
        description: "Merged via compare tool",
        resolution,
      });

      // refresh list
      if (resumeId) {
        const v = await fetchResumeVersions({ userid: user._id, resumeid: resumeId });
        setVersions(v?.items || []);
        setDefaultVersionId(v?.defaultVersionId || null);
      }

      // load new merged version
      const full = await fetchResumeVersion({ userid: user._id, versionid: created._id });
      if (full?.content) {
        setData(full.content);
        setFilename(created?.name || filename);
        setCurrentVersionId(created._id);
        setCurrentVersionName(created?.name || null);
      }
      setShowCompareModal(false);
      setSelectedForCompare([]);
    } catch (e: any) {
      alert(e?.message ?? "Merge failed");
    }
  }

  /* ---------- UI ---------- */

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">
          {currentVersionId
            ? `Resume Editor — ${currentVersionName || "Version"}`
            : "Resume Editor"}
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
            <Button
          onClick={() => setShowShareSettings(true)}
          disabled={!resumeId}
        >
          Share
        </Button>


          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            File name:
          </label>
          <input
            className="flex-1 max-w-md rounded border px-3 py-2 text-sm"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <div className="flex-1" />

          {error ? (
            <span className="text-xs text-red-500">Error: {error}</span>
          ) : (
            lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {new Date(lastSaved).toLocaleString?.() || lastSaved}
              </span>
            )
          )}

          <Button onClick={handleSaveAndGoBack}>Save</Button>
          <Button onClick={handleExport}>Export</Button>
          <Button onClick={handleRegenAI}>Regenerate with AI</Button>
          <Button onClick={openCreateVersion} disabled={!resumeId}>
            Create New Version
          </Button>
        </div>

        {/* Version context + rename */}
        {currentVersionId ? (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              Editing <strong>Version</strong>
            </span>

            {!renamingVersion ? (
              <>
                <span className="text-gray-700">
                  Name: <strong>{currentVersionName || "(untitled version)"}</strong>
                </span>
                <button
                  className="underline text-xs text-emerald-700"
                  onClick={() => {
                    setRenameDraft(currentVersionName || "");
                    setRenamingVersion(true);
                  }}
                >
                  Rename
                </button>
                                <button
                  className="underline text-xs text-emerald-700"
                  onClick={() => {
                    if (!currentVersionId) {
                      alert("Create or load a version first.");
                      return;
                    }
                    setLinkingVersionId(currentVersionId);
                    setShowJobPicker(true);
                  }}
                >
                  Link to job
                </button>
              </>
            ) : (
              <form
                className="flex items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const raw = localStorage.getItem("authUser");
                    const u = raw ? JSON.parse(raw) : null;
                    const uid = u?.user?._id ?? u?._id ?? null;
                    if (!uid || !currentVersionId)
                      throw new Error("Missing session or version id");

                    await updateResumeVersionContent({
                      userid: uid,
                      versionid: currentVersionId,
                      content: data,
                      name: (renameDraft || "").trim() || "Untitled Version",
                    });

                    setCurrentVersionName(
                      (renameDraft || "").trim() || "Untitled Version"
                    );
                    setRenamingVersion(false);

                    // refresh list to reflect rename
                    if (resumeId) {
                      const v = await fetchResumeVersions({
                        userid: uid,
                        resumeid: resumeId,
                      });
                      setVersions(v?.items || []);
                      setDefaultVersionId(v?.defaultVersionId || null);
                    }
                  } catch (err: any) {
                    alert(err?.message ?? "Rename failed");
                  }
                }}
              >
                <input
                  className="rounded border px-2 py-1 text-sm"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  placeholder="Version name"
                />
                <button className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">
                  Save
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-gray-100 rounded text-xs"
                  onClick={() => setRenamingVersion(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-600">
            Editing <strong>Base Resume</strong>
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-4">
        Loaded template: <strong>{template.title || template.key}</strong>
      </p>

      {/* ai handling: variations panel */}
      {aiVars && aiVars.length > 0 && (
        <div className="mb-8 border border-emerald-200 rounded-lg p-5 bg-emerald-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              AI suggestions ({aiVars.length} variation
              {aiVars.length > 1 ? "s" : ""})
            </h2>
            <div className="flex gap-2">
              {aiVars.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAiIdx(i)}
                  className={`text-xs px-2 py-1 rounded ${
                    i === aiIdx ? "bg-emerald-600 text-white" : "bg-white border"
                  }`}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded bg-white border p-3">
              <div className="font-medium mb-1">Suggested Summary</div>
              {(aiVars[aiIdx].summarySuggestions || []).length ? (
                <ul className="list-disc pl-5 space-y-1">
                  {aiVars[aiIdx].summarySuggestions!.map((s, i) => (
                    <li key={i} className="text-sm">
                      {s}{" "}
                      <button
                        className="text-emerald-700 underline ml-2"
                        onClick={() => replaceSummary(s)}
                      >
                        Use
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">
                  No summary suggestions in this variation.
                </div>
              )}
            </div>

            <div className="rounded bg-white border p-3">
              <div className="font-medium mb-1">Suggested Skills</div>
              <div className="flex flex-wrap gap-2">
                {(aiVars[aiIdx].skills || []).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs border rounded-full px-3 py-1 bg-white"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded bg-white border p-3">
            <div className="font-medium mb-2">
              Tailored Bullets (by experience index)
            </div>
            <div className="space-y-3">
              {(aiVars[aiIdx].experienceBullets || []).map((eb, i) => (
                <div key={i} className="text-sm">
                  <div className="font-semibold">
                    [#{eb.sourceExperienceIndex}] {eb.jobTitle} @ {eb.company}
                  </div>
                  <ul className="list-disc pl-5">
                    {eb.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                className="px-4 py-2 rounded bg-emerald-600 text-white"
                onClick={() => applyAiCandidate(aiVars[aiIdx])}
              >
                Apply this variation
              </button>
              <div className="text-xs text-gray-600">
                (Adds bullets to matching experiences and merges suggested
                skills.)
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: editors + lists */}
        <div className="space-y-6">
          {/* validation */}
            <div className="space-y-4">
              <div className="rounded border p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-sm">Resume Quality Check</h3>
                    {lastValidatedAt && (
                      <div className="text-[10px] text-gray-500">
                        Last checked {new Date(lastValidatedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRunValidation}
                    className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Run Checks
                  </button>
                </div>

                {validation ? (
                  <>
                    <div className="flex flex-wrap gap-2 text-[11px] mb-3">
                      <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                        Words: <strong>{validation.wordCount}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                        Est. length:{" "}
                        <strong>
                          {validation.estimatedPages} page
                          {validation.estimatedPages !== 1 ? "s" : ""}
                        </strong>
                      </span>
                      <span className="px-2 py-1 rounded-full bg-white border text-gray-700">
                        Tone:{" "}
                        <strong className="capitalize">{validation.tone}</strong>
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full border ${
                          validation.contactOk
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {validation.contactOk ? "Contact info looks OK" : "Contact issues detected"}
                      </span>
                    </div>

                    {validation.issues.length === 0 ? (
                      <p className="text-xs text-emerald-700">
                        ✅ No major issues detected. Still consider a manual review for nuance and style.
                      </p>
                    ) : (
                      <ul className="space-y-1 max-h-48 overflow-auto text-xs">
                        {validation.issues.map((issue, idx) => {
                          const colorClass =
                            issue.severity === "error"
                              ? "text-red-700"
                              : issue.severity === "warning"
                              ? "text-amber-700"
                              : "text-gray-700";
                          const badgeClass =
                            issue.type === "missing-info"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : issue.type === "length"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : issue.type === "contact"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : issue.type === "tone"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-gray-50 text-gray-700 border-gray-200";

                          return (
                            <li key={idx} className={`flex gap-2 ${colorClass}`}>
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${badgeClass}`}
                              >
                                {issue.type.replace("-", " ")}
                              </span>
                              <span>{issue.message}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <p className="mt-2 text-[10px] text-gray-500">
                      Note: These checks are heuristic and don’t replace a full spell/grammar tool,
                      but they help catch common issues before you submit.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">
                    Click <span className="font-semibold">Run Checks</span> to analyze your resume
                    for length, missing info, contact issues, and tone.
                  </p>
                )}
              </div>
            </div>

          <div>
            <h2 className="font-semibold mb-2 text-center">Quick Editors</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("header")}
              >
                Edit Name
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("summary")}
              >
                Edit Summary
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("skills:add")}
              >
                Edit Skills
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("experience:add")}
              >
                Add Experience
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("education:add")}
              >
                Add Education
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("project:add")}
              >
                Add Project
              </button>
            </div>
            {editing && (
              <div className="rounded border p-4 mt-3">
                <EditorForm />
              </div>
            )}
          </div>

          {/* Skills chip editor */}
          <div className="rounded border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Skills</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const inp = form.elements.namedItem(
                    "newSkill"
                  ) as HTMLInputElement;
                  addSkill(inp.value);
                  inp.value = "";
                }}
                className="flex gap-2"
              >
                <input
                  name="newSkill"
                  placeholder="Add a skill"
                  className="rounded border px-2 py-1 text-sm"
                />
                <button className="rounded px-3 py-1 text-xs border hover:bg-gray-50">
                  Add
                </button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.skills || []).map((s: any, i: number) => {
                const label = typeof s === "string" ? s : s?.name;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                  >
                    {label}
                    <button
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => removeSkill(i)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Experience list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Experience</h3>
            <ul className="space-y-2">
              {(data.experience || []).map((e: any, i: number) => (
                <li
                  key={i}
                  className="text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">
                      {(e?.jobTitle || "Title")} • {(e?.company || "Company")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(e?.startDate || "")} – {(e?.endDate || "Present")}
                      {e?.location ? ` • ${e.location}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("experience:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeProject(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.experience || []).length === 0 && (
                <li className="text-xs text-gray-500">
                  No experience added yet.
                </li>
              )}
            </ul>
          </div>

          {/* Education list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Education</h3>
            <ul className="space-y-2">
              {(data.education || []).map((ed: any, i: number) => (
                <li
                  key={i}
                  className="text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">
                      {(ed?.degree || "Degree")}
                      {ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(ed?.institution || "School")}
                      {ed?.graduationDate ? ` • ${ed.graduationDate}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("education:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeEducation(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.education || []).length === 0 && (
                <li className="text-xs text-gray-500">
                  No education added yet.
                </li>
              )}
            </ul>
          </div>

          {/* Projects list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Projects</h3>
            <ul className="space-y-2">
              {(data.projects || []).map((p: any, i: number) => (
                <li
                  key={i}
                  className="text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">{p?.name || "Project"}</div>
                    {p?.technologies && (
                      <div className="text-xs text-gray-500">
                        {p.technologies}
                      </div>
                    )}
                    {p?.outcomes && (
                      <div className="text-xs">{p.outcomes}</div>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("project:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeProject(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.projects || []).length === 0 && (
                <li className="text-xs text-gray-500">
                  No projects added yet.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="border rounded p-3">
          <Suspense
            fallback={
              <div className="text-sm text-gray-500 p-6">Loading preview…</div>
            }
          >
            <Preview data={data} onEdit={(s: any) => setEditing(s)} />
          </Suspense>
        </div>
      </div>

      {/* Versions panel */}
      {Array.isArray(versions) && versions.length > 0 && (
        <div className="mt-6 rounded border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Versions</h3>
            <div className="flex items-center gap-2">
              <Button onClick={openCreateVersion} disabled={!resumeId}>
                Create New Version
              </Button>
              <Button
                onClick={openCompareModal}
                disabled={selectedForCompare.length !== 2}
              >
                Compare Selected (2)
              </Button>
            </div>
          </div>
          <ul className="mt-3 divide-y">
            {versions.map((v) => {
              const selected = selectedForCompare.includes(v._id);
              return (
                <li key={v._id} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCompareSelection(v._id)}
                      title="Select for comparison"
                    />
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        {v.name || v._id}
                        {defaultVersionId && String(defaultVersionId) === String(v._id) ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            default
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500">
                        {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={async () => {
                        try {
                          const raw = localStorage.getItem("authUser");
                          const u = raw ? JSON.parse(raw) : null;
                          const uid = u?.user?._id ?? u?._id ?? null;
                          if (!uid) throw new Error("Missing user session");
                          const full = await fetchResumeVersion({
                            userid: uid,
                            versionid: v._id,
                          });
                          if (full?.content) {
                            setData(full.content);
                            setFilename(v.name || filename);
                            setCurrentVersionId(v._id);
                            setCurrentVersionName(v.name || null);
                            setRenamingVersion(false);
                          }
                        } catch (e: any) {
                          alert(e?.message ?? "Failed to load version");
                        }
                      }}
                    >
                      Load
                    </button>
                    <button
                      className="text-xs underline"
                      onClick={() => handleSetDefault(v._id)}
                    >
                      Set default
                    </button>
                    <button
                      className="text-xs underline text-amber-700"
                      onClick={() => handleArchive(v._id)}
                    >
                      Archive
                    </button>
                    <button
                      className="text-xs underline text-red-600"
                      onClick={() => handleDelete(v._id)}
                      disabled={
                        defaultVersionId != null &&
                        String(defaultVersionId) === String(v._id)
                      }
                      title={
                        defaultVersionId &&
                        String(defaultVersionId) === String(v._id)
                          ? "Cannot delete default version"
                          : "Delete version"
                      }
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateVersion && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Version</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowCreateVersion(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Option A: from default */}
              <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  className="mt-1"
                  name="sourceChoice"
                  value="default"
                  checked={sourceChoice === "default"}
                  onChange={() => setSourceChoice("default")}
                />
                <div>
                  <div className="font-medium">From default version</div>
                  <div className="text-xs text-gray-600">
                    Clone the current default/master resume version.
                  </div>
                </div>
              </label>

              {/* Option B: from existing (only if versions exist) */}
              {Array.isArray(versions) && versions.length > 0 && (
                <div className="p-3 border rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-1"
                      name="sourceChoice"
                      value="existing"
                      checked={sourceChoice === "existing"}
                      onChange={() => setSourceChoice("existing")}
                    />
                    <div>
                      <div className="font-medium">From an existing version</div>
                      <div className="text-xs text-gray-600">
                        Clone any previous tailored version.
                      </div>
                    </div>
                  </label>

                  {sourceChoice === "existing" && (
                    <div className="mt-3">
                      <select
                        className="w-full rounded border px-3 py-2 text-sm"
                        value={existingSourceId}
                        onChange={(e) => setExistingSourceId(e.target.value)}
                      >
                        <option value="" disabled>
                          Select a version…
                        </option>
                        {versions.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.name || v._id}
                            {defaultVersionId &&
                            String(defaultVersionId) === String(v._id)
                              ? " (default)"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* If no versions, we still show A; B hidden automatically */}
              {!versions || versions.length === 0 ? (
                <div className="text-xs text-gray-500">
                  You don’t have other versions yet. You can start from the default.
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100"
                onClick={() => setShowCreateVersion(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
                onClick={handleCreateVersionConfirm}
                disabled={sourceChoice === "existing" && !existingSourceId}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

{/* Share Settings Modal */}
{showShareSettings && (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold">Share resume</h3>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setShowShareSettings(false)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Choose who can access this shared link and whether they can leave comments.
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
            />
            <div>
              <div className="font-medium">Restricted</div>
              <div className="text-xs text-gray-500">
                Only approved reviewers (e.g., your account or whitelisted users) can view.
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
          />
          <div>
            <div className="font-medium">Allow comments</div>
            <div className="text-xs text-gray-500">
              Reviewers can leave feedback on this resume.
            </div>
          </div>
        </label>
      </div>

      {/* Last shared URL (optional) */}
      {shareUrl && (
        <div className="mb-4 text-xs text-gray-600 break-all bg-gray-50 border rounded px-3 py-2">
          Last share link: <span className="font-mono">{shareUrl}</span>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded bg-gray-100 text-sm"
          onClick={() => setShowShareSettings(false)}
          disabled={shareLoading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
          onClick={handleShareConfirm}
          disabled={shareLoading}
        >
          {shareLoading ? "Sharing…" : "Copy share link"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Compare & Merge Modal */}
      {showCompareModal && diff && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border p-6 max-h-[85vh] overflow-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            Compare versions side-by-side
          </h3>
          {/* optional: show which versions are left/right if backend sends meta */}
          {diff.meta && (diff.meta.left || diff.meta.right) && (
            <p className="mt-1 text-xs text-gray-600">
              Left:{" "}
              <strong>{diff.meta.left?.name || diff.meta.left?._id || "Left"}</strong>
              {"  •  "}
              Right:{" "}
              <strong>{diff.meta.right?.name || diff.meta.right?._id || "Right"}</strong>
            </p>
          )}
        </div>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setShowCompareModal(false)}
        >
          ✕
        </button>
      </div>

      {/* Summary diff */}
      {"summary" in (diff.fields || {}) && (
        <div className="mb-4">
          <div className="font-medium mb-1">Summary</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">Left version</div>
              <div>{diff.fields.summary.left || <em>—</em>}</div>
            </div>
            <div className="p-3 rounded border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">Right version</div>
              <div>{diff.fields.summary.right || <em>—</em>}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSummary"
                checked={mergeChoiceSummary === "right"}
                onChange={() => setMergeChoiceSummary("right")}
              />
              Use right summary
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSummary"
                checked={mergeChoiceSummary === "base"}
                onChange={() => setMergeChoiceSummary("base")}
              />
              Keep left summary
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSummary"
                checked={mergeChoiceSummary === "custom"}
                onChange={() => setMergeChoiceSummary("custom")}
              />
              Custom summary
            </label>
          </div>
          {mergeChoiceSummary === "custom" && (
            <textarea
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
              placeholder="Custom summary"
              value={mergeCustomSummary}
              onChange={(e) => setMergeCustomSummary(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Skills diff */}
      {"skills" in (diff.fields || {}) && (
        <div className="mb-4">
          <div className="font-medium mb-1">Skills</div>
          <div className="text-xs text-gray-600 mb-2">
            Added in right: {diff.fields.skills.added?.join(", ") || "—"}
            {" • "}
            Removed from left: {diff.fields.skills.removed?.join(", ") || "—"}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSkills"
                checked={mergeChoiceSkills === "union"}
                onChange={() => setMergeChoiceSkills("union")}
              />
              Union of both
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSkills"
                checked={mergeChoiceSkills === "base"}
                onChange={() => setMergeChoiceSkills("base")}
              />
              Keep left
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="mergeSkills"
                checked={mergeChoiceSkills === "right"}
                onChange={() => setMergeChoiceSkills("right")}
              />
              Use right
            </label>
          </div>
        </div>
      )}

      {/* Experience bullets diff */}
      {(diff.fields?.experience || []).length > 0 && (
        <div className="mb-4">
          <div className="font-medium mb-1">Experience bullets</div>
          <div className="space-y-3">
            {diff.fields.experience.map((e: any) => {
              const key = `experience[${e.index}].bullets`;
              const choice = mergeChoiceExp[key] || "right";
              return (
                <div key={key} className="border rounded p-3 text-sm">
                  <div className="font-medium mb-1">Entry #{e.index}</div>
                  <div className="text-xs text-gray-600 mb-2">
                    Added in right: {e.bullets.added?.join("; ") || "—"}
                    {" • "}
                    Removed from left: {e.bullets.removed?.join("; ") || "—"}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={key}
                        checked={choice === "right"}
                        onChange={() =>
                          setMergeChoiceExp((d) => ({ ...d, [key]: "right" }))
                        }
                      />
                      Use right bullets
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={key}
                        checked={choice === "base"}
                        onChange={() =>
                          setMergeChoiceExp((d) => ({ ...d, [key]: "base" }))
                        }
                      />
                      Keep left bullets
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={key}
                        checked={choice === "custom"}
                        onChange={() =>
                          setMergeChoiceExp((d) => ({ ...d, [key]: "custom" }))
                        }
                      />
                      Custom bullets
                    </label>
                  </div>
                  {choice === "custom" && (
                    <textarea
                      className="mt-2 w-full rounded border px-3 py-2 text-xs"
                      placeholder="One bullet per line"
                      value={mergeCustomExp[key] || ""}
                      onChange={(e) =>
                        setMergeCustomExp((d) => ({
                          ...d,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          className="px-4 py-2 rounded bg-gray-100"
          onClick={() => setShowCompareModal(false)}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white"
          onClick={doMerge}
        >
          Merge → New Version
        </button>
      </div>
    </div>
  </div>
)}


      {/* AI re-gen modals */}
      <JobPickerSheet
        open={showJobPicker}
        onClose={() => setShowJobPicker(false)}
        jobs={jobs || []}
        loading={jobsLoading}
        error={jobsError}
        onPickJob={handlePickJob}
        onEnterManual={handleEnterJobManual}
      />

      {showMiniForm && (
        <MiniJobForm
          open={showMiniForm}
          onCancel={() => setShowMiniForm(false)}
          onSubmit={handleMiniFormSubmit}
        />
      )}

      {aiLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
            <div className="text-lg font-semibold text-gray-800">
              Regenerating your resume…
            </div>
            <div className="text-sm text-gray-500">
              This usually takes a few seconds.
            </div>
            {aiError && (
              <div className="mt-2 text-sm text-red-600 max-w-xs text-center">
                {aiError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <details className="w-full">
          <summary className="cursor-pointer text-sm text-gray-600">
            Preview PDF (optional)
          </summary>
          <div className="mt-3 border rounded overflow-hidden">
            <Suspense
              fallback={
                <div className="p-6 text-sm text-gray-500">Loading PDF…</div>
              }
            >
              <PDFViewer width="100%" height={700} showToolbar>
                {pdfDoc}
              </PDFViewer>
            </Suspense>
          </div>
        </details>

        <Suspense
          fallback={
            <button className="px-4 py-2 bg-gray-300 text-white rounded">
              Preparing…
            </button>
          }
        >
          <PDFDownloadLink
            document={pdfDoc}
            fileName={`${(currentVersionName || filename || "resume")
              .trim()
              .replace(/\s+/g, "_")}.pdf`}
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
          </PDFDownloadLink>
        </Suspense>
      </div>
    </div>
  );
}
