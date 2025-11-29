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

import type { ResumeData, TemplateKey, ContactInfo } from "../../api/resumes";
import { saveResume, updateResume, GetAiResumeContent } from "../../api/resumes";

import JobPickerSheet from "./JobPickerSheet";
import MiniJobForm, { type JobDraft } from "./MiniJobForm";
import { useJobs, type Job } from "./hooks/useJobs";

import {
  THEMES,
  TEMPLATE_DEFAULT_THEME,
  type ThemeKey,
} from "./resumeThemes";

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

const ResumeEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || null) as LocationState | null;

  const template = state?.template;
  const initialId = state?.ResumeId ?? null;
  const initialPayload = state?.resumeData;

  // Guard: if someone hits this route directly with no template
  useEffect(() => {
    if (!template) {
      navigate("/resumes", { replace: true });
    }
  }, [template, navigate]);

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
  const [draggingId, setDraggingId] = useState<SectionId | null>(null);

  // Theme
  const initialThemeKey: ThemeKey =
    TEMPLATE_DEFAULT_THEME[template.key] || "classic";
  const [themeKey, setThemeKey] = useState<ThemeKey>(initialThemeKey);
  const theme = THEMES[themeKey];

  // Validation
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  // AI variants (for suggestions UI)
  const [aiVars, setAiVars] = useState<AiResumeCandidate[]>(
    initialAiCandidates
  );
  const [aiIdx, setAiIdx] = useState(0);

  // Jobs / AI
  const { jobs, loading: jobsLoading, err: jobsError, isLoggedIn } = useJobs();
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /* Derived */

  const visibleSectionIds = useMemo(
    () => sections.filter((s) => s.enabled).map((s) => s.id),
    [sections]
  );

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
    aiVars.length > 0
      ? aiVars[Math.min(aiIdx, aiVars.length - 1)]
      : undefined;

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
      prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : { ...s }
      )
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
    (idx: number, field: string) =>
    (e: ChangeEvent<HTMLInputElement>) => {
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
        const id =
          (created as any)?._id || (created as any)?.resumeid || null;
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
      console.log("[AI] Calling GetAiResumeContent with job/draft:", jobOrDraft);

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
    setAiIdx((idx) =>
      aiVars.length === 0 ? 0 : (idx + 1) % aiVars.length
    );
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
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Edit Resume – {template.key.toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500">
            Fine-tune your resume content, run checks, and export to multiple
            formats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename"
          />
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
        </div>
      </div>

      {/* Status */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      {lastSaved && (
        <div className="text-xs text-gray-500">
          Last saved: {new Date(lastSaved).toLocaleString()}
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
                          onChange={updateEducationField(
                            idx,
                            "graduationDate"
                          )}
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
              {sections.map((s) => (
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
                    <span className="font-medium text-gray-700">
                      {s.label}
                    </span>
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
                    sectionOrder={sections.map((s) => s.id)}
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
    </div>
  );
};

export default ResumeEditor;
