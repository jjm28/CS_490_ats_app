import { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { useNavigate } from "react-router-dom";

import { resumePreviewRegistry, resumePdfRegistry } from "../../components/Resume";
import type { ResumeData, TemplateKey } from "../../api/resumes";
import { listResumeTemplates, getDefaultResumeTemplate, setDefaultResumeTemplate } from "../../api/templates";
import { GetAiResumeContent } from "../../api/resumes";

import { PDFViewer } from "@react-pdf/renderer";

import JobPickerSheet from "../Resume/JobPickerSheet";
import MiniJobForm, { type JobDraft } from "../Resume/MiniJobForm";
import { useJobs } from "./hooks/useJobs";

/* ---------------- Types & helpers ---------------- */

type TemplateMeta = {
  templateKey: TemplateKey;
  title: string;
  blurb?: string;
  img?: string;
};

function getUserId(): string | null {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  return (
    u?._id ??
    u?.id ??
    u?.userId ??
    u?.userid ??
    u?.user?._id ??
    u?.user?.id ??
    u?.user?.userId ??
    u?.user?.userid ??
    null
  );
}

function starterDataForTemplate(key: TemplateKey): ResumeData {
  const base: ResumeData = {
    name: "Your Name",
    summary:
      "Results-driven developer experienced in TypeScript, React, Node, and MongoDB. Known for shipping delightful, reliable UX.",
    experience: [
      {
        company: "Acme Inc.",
        jobTitle: "Software Engineer",
        startDate: "2023-06-01",
        endDate: null,
        location: "Newark, NJ",
        highlights: [
          "Shipped a customer portal used by 10k+ monthly users",
          "Cut API latencies by 35% via caching and query tuning",
        ],
      },
    ],
    education: [
      {
        institution: "NJIT",
        degree: "B.S. Computer Science",
        fieldOfStudy: "Computer Science",
        graduationDate: "2026-05-01",
      },
    ],
    skills: [{ name: "TypeScript" }, { name: "React" }, { name: "Node.js" }, { name: "MongoDB" }],
    projects: [{ name: "Portfolio", technologies: "React, TS", outcomes: "Deployed on Vercel • Lighthouse 98+" }],
    style: { color: { primary: "#111827" }, font: { family: "Sans" }, layout: { columns: 1 } },
  };

  if (key === "functional") {
    return {
      ...base,
      summary:
        "Front-end focused engineer with strong UI systems and DX tooling background. Passionate about code quality and accessibility.",
    };
  }
  if (key === "hybrid") {
    return {
      ...base,
      style: { ...base.style, layout: { columns: 2 } },
    };
  }
  return base;
}

/* ---------- AI: normalization helpers (non-AI parts unchanged) ---------- */

// Convert loose AI payload to strict ResumeData shape
function toResumeData(payload: any, templateKey: TemplateKey): ResumeData {
  if (!payload || typeof payload !== "object") {
    return starterDataForTemplate(templateKey);
  }

  const skillsArr = Array.isArray(payload.skills)
    ? payload.skills
        .map((s: any) => (typeof s === "string" ? { name: s } : { name: s?.name || "" }))
        .filter((s: any) => s.name)
    : [];

  const expArr = Array.isArray(payload.experience)
    ? payload.experience.map((e: any) => ({
        company: e?.company || "",
        jobTitle: e?.jobTitle || e?.title || "",
        startDate: e?.startDate || "",
        endDate: e?.endDate ?? null,
        location: e?.location || "",
        highlights: Array.isArray(e?.highlights)
          ? e.highlights.map((h: any) => String(h)).filter(Boolean)
          : [],
      }))
    : [];

  const eduArr = Array.isArray(payload.education)
    ? payload.education.map((ed: any) => ({
        institution: ed?.institution || ed?.school || "",
        degree: ed?.degree || "",
        fieldOfStudy: ed?.fieldOfStudy || ed?.major || "",
        graduationDate: ed?.graduationDate || "",
      }))
    : [];

  const projArr = Array.isArray(payload.projects)
    ? payload.projects.map((p: any) => ({
        name: p?.name || "",
        technologies: p?.technologies || "",
        outcomes: p?.outcomes || "",
      }))
    : [];

  return {
    name: payload.name || "Your Name",
    summary: payload.summary || "",
    experience: expArr,
    education: eduArr,
    skills: skillsArr,
    projects: projArr,
    style: payload.style || {
      color: { primary: "#111827" },
      font: { family: "Sans" },
      layout: { columns: 1 },
    },
  };
}

// Pick the best candidate from AI response (supports {data} or {parsedCandidates: []})
function pickAiResumeData(ai: any, templateKey: TemplateKey): ResumeData {
  const candidate = ai?.data ?? (Array.isArray(ai?.parsedCandidates) ? ai.parsedCandidates[0] : null);
  return toResumeData(candidate, templateKey);
}

/* ---------------- Component ---------------- */

export default function NewResume() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [defaultKey, setDefaultKey] = useState<TemplateKey | null>(null);

  const [active, setActive] = useState<TemplateMeta | null>(null);
  const [open, setOpen] = useState(false);
  const [chooseMode, setChooseMode] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ai handling
  const { jobs, loading: jobsLoading, err: jobsError, isLoggedIn } = useJobs();
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showMiniForm, setShowMiniForm] = useState(false);

  // helper
  const safeGetUser = () => {
    const raw = localStorage.getItem("authUser");
    if (!raw) throw new Error("Not signed in (authUser missing).");
    const u = JSON.parse(raw).user || JSON.parse(raw);
    if (!u?._id) throw new Error("authUser is missing _id.");
    return u;
  };

  // “Generate with AI” button => open job picker
  const handleGenerateAI = async () => {
    if (!active) return;
    if (!isLoggedIn) return navigate("/login", { state: { flash: "Please log in to use AI." } });
    setShowJobPicker(true);
  };

  // Pick an existing job -> call AI -> navigate to editor with AI draft
  const handlePickJob = async (job: import("./hooks/useJobs").Job) => {
    setShowJobPicker(false);
  setChooseMode(false);
  setOpen(false);

  setAiError(null);
  setAiLoading(true);

  try {
    const user = safeGetUser();
    const ai = await GetAiResumeContent({ userid: user._id, Jobdata: job });

    // 🔥 Make sure AI returns normalized ResumeData
    const aiData =
      ai?.data ||
      (Array.isArray(ai?.parsedCandidates) ? ai.parsedCandidates[0] : null);

    if (!aiData) throw new Error("AI returned no usable resume data.");

    navigate("/resumes/editor", {
      state: {
        template: { key: active!.templateKey, title: active!.title },
        AImode: true,
        AiResume: ai,     // raw AI payload
        resumeData: {
          filename: `${active!.title} — Draft`,
        templateKey: active!.templateKey,
          resumedata: aiData,      // 🔥 This ensures ResumeEditor loads AI fields
          lastSaved: null
        }
      }
    });
  } catch (e: any) {
    setAiError(e?.message ?? String(e));
  } finally {
    setAiLoading(false);
  }
  };

  const handleMiniFormSubmit = async (draft: JobDraft) => {
    setShowMiniForm(false);
    setAiError(null);
    setAiLoading(true);
    try {
      const user = safeGetUser();
      const ai = await GetAiResumeContent({ userid: user._id, Jobdata: draft });
      const generated = pickAiResumeData(ai, active!.templateKey);

      navigate("/resumes/editor", {
        state: {
          template: { key: active!.templateKey, title: active!.title },
          AImode: true,
          ResumeId: null,
          
          resumeData: {
            filename: `${active!.title} – AI Draft`,
            templateKey: active!.templateKey,
            resumedata: generated,
            lastSaved: null,
          },
          AiResumeRaw: ai,
        },
      });
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message ?? "AI generation failed");
      // still let the user continue editing with a starter doc
      const fallback = starterDataForTemplate(active!.templateKey);
      navigate("/resumes/editor", {
        state: {
          template: { key: active!.templateKey, title: active!.title },
          AImode: true,
          ResumeId: null,
          resumeData: {
            filename: `${active!.title} – Draft`,
            templateKey: active!.templateKey,
            resumedata: fallback,
            lastSaved: null,
          },
        },
      });
    } finally {
      setAiLoading(false);
    }
  };
  // ai handling END

  // fetch templates + default (UNCHANGED behavior)
  useEffect(() => {
    (async () => {
      try {
        const userid = getUserId();
        if (!userid) throw new Error("Missing user session");
        const list = await listResumeTemplates({ userid });

        const metas: TemplateMeta[] = (list || []).map((t: any) => ({
          templateKey: t.templateKey as TemplateKey,
          title: t.title || t.templateKey,
          blurb: t.description || t.blurb || "",
          img: t.image || t.img,
        }));
        setTemplates(metas);

        const d = await getDefaultResumeTemplate({ userid }).catch(() => ({ templateKey: null }));
        setDefaultKey((d?.templateKey as TemplateKey) ?? null);
      } catch (e) {
        console.error(e);
        setTemplates([]);
      }
    })();
  }, []);

  const onPreview = (tpl: TemplateMeta) => {
    setActive(tpl);
    setOpen(true);
    setChooseMode(false);
  };

  const openChoice = () => {
    if (!active) return;
    setChooseMode(true);
  };

  const handleCreateManual = () => {
    if (!active) return;
    const demo = starterDataForTemplate(active.templateKey);
    setChooseMode(false);
    setOpen(false);
    navigate("/resumes/editor", {
      state: {
        template: { key: active.templateKey, title: active.title },
        ResumeId: null,
        resumeData: {
          filename: `${active.title} – Draft`,
          templateKey: active.templateKey,
          resumedata: demo,
          lastSaved: null,
        },
      },
    });
  };

  const setAsDefault = async (tpl: TemplateMeta) => {
    try {
      const userid = getUserId();
      if (!userid) throw new Error("Missing user session");
      await setDefaultResumeTemplate({ userid, templateKey: tpl.templateKey });
      setDefaultKey(tpl.templateKey);
    } catch (e: any) {
      alert(e?.message ?? "Failed to set default");
    }
  };

  // live preview registry component (UNCHANGED)
  const Preview = useMemo(() => {
    if (!active) return null;
    return resumePreviewRegistry[active.templateKey];
  }, [active]);

  // PDF preview registry component (UNCHANGED)
  const PdfComp = useMemo(() => {
    if (!active) return null;
    return resumePdfRegistry[active.templateKey];
  }, [active]);

  // demo data for previews only (UNCHANGED)
  const demoData: ResumeData = useMemo(
    () => ({
      name: "Your Name",
      summary:
        "Results-driven developer experienced in TypeScript, React, Node, and MongoDB. Known for shipping delightful, reliable UX.",
      experience: [
        { company: "Acme Inc.", jobTitle: "Software Engineer", startDate: "2023-06-01", endDate: null, highlights: ["Shipped X", "Improved Y"] },
      ],
      education: [{ institution: "NJIT", degree: "B.S. Computer Science", graduationDate: "2026-05-01" }],
      skills: [{ name: "TypeScript" }, { name: "React" }, { name: "Node.js" }, { name: "MongoDB" }],
      projects: [{ name: "Portfolio", technologies: "React, TS", outcomes: "Deployed on Vercel" }],
      style: { color: { primary: "#111827" }, font: { family: "Sans", sizeScale: "M" }, layout: { columns: 1 } },
    }),
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <h1 className="text-2xl font-semibold text-center mb-8">Select a resume template</h1>

      {/* Template grid (UNCHANGED) */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${aiLoading ? "opacity-50 pointer-events-none" : ""}`}>
        {templates.map((t) => {
          const isDefault = defaultKey === t.templateKey;
          return (
            <Card key={t.templateKey} className="relative overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col">
              {isDefault && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-600/90 text-white text-[11px] font-semibold px-3 py-1 shadow">
                  Default
                </span>
              )}

              <div className="w-full aspect-3/4 overflow-hidden">
                {t.img ? (
                  <img src={t.img} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-400 text-sm bg-gray-50">No preview</div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-2">{t.title}</h2>
                {t.blurb && <p className="text-sm text-gray-600 flex-1">{t.blurb}</p>}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => onPreview(t)}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                    disabled={aiLoading}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setAsDefault(t)}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                    disabled={aiLoading || defaultKey === t.templateKey}
                    title={defaultKey === t.templateKey ? "Already default" : "Set as default"}
                  >
                    {defaultKey === t.templateKey ? "Default" : "Set default"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal with Live/PDF preview + choose mode (UNCHANGED, except Generate with AI button uses job picker) */}
      {open && active && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[92vw] max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col outline-none">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200/70">
              <h3 className="text-lg font-semibold">
                {active.title} {defaultKey === active.templateKey ? <span className="ml-2 text-xs text-emerald-600">(default)</span> : null}
              </h3>
              <button aria-label="Close" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 md:px-6 py-4 space-y-4">
              {/* Live client-side preview */}
              {Preview ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 text-sm text-gray-600 border-b">Live Preview</div>
                  <div className="p-4">
                    <Preview data={demoData} onEdit={() => {}} />
                  </div>
                </div>
              ) : null}

              {/* PDF preview */}
              {PdfComp ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 text-sm text-gray-600 border-b">PDF Preview</div>
                  <PDFViewer width="100%" height={480} showToolbar>
                    <PdfComp data={demoData} />
                  </PDFViewer>
                </div>
              ) : null}

              {active.blurb && <p className="text-sm text-gray-600">{active.blurb}</p>}
            </div>

            <div className="shrink-0 sticky bottom-0 px-4 md:px-6 py-3 border-t border-gray-200/70 bg-white">
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={() => setAsDefault(active)}
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                  disabled={defaultKey === active.templateKey}
                >
                  {defaultKey === active.templateKey ? "Default Template" : "Set as Default"}
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200">
                    Cancel
                  </button>
                  <button onClick={openChoice} className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                    Use Selected
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Choice sheet */}
          {chooseMode && (
            <div
              className="absolute inset-0 z-50 flex items-end md:items-center md:justify-center"
              aria-modal="true"
              role="dialog"
              onClick={(e) => {
                if (e.target === e.currentTarget) setChooseMode(false);
              }}
            >
              <div className="w-full md:w-[420px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6">
                <h4 className="text-base font-semibold mb-2">How would you like to start?</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Use <span className="font-medium">{active.title}</span> and:
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCreateManual}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
                    disabled={aiLoading}
                  >
                    <div className="font-medium">Create Manually</div>
                    <div className="text-xs text-gray-600">Start with sample content and edit it yourself.</div>
                  </button>

                  <button
                    onClick={handleGenerateAI}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-left text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={aiLoading}
                  >
                    <div className="font-medium">Generate with AI</div>
                    <div className="text-xs opacity-90">We’ll draft a first version you can refine.</div>
                  </button>
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={() => setChooseMode(false)} className="text-sm text-gray-600 hover:text-gray-800">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job picker + mini form for AI (NEW UI elements for the AI path) */}
      <JobPickerSheet
        open={showJobPicker}
        onClose={() => setShowJobPicker(false)}
        jobs={jobs}
        loading={jobsLoading}
        error={jobsError}
        onPickJob={handlePickJob}
        onEnterManual={() => setShowMiniForm(true)}
      />
      <MiniJobForm
        open={showMiniForm}
        onCancel={() => setShowMiniForm(false)}
        onSubmit={handleMiniFormSubmit}
      />

      {/* global AI overlay */}
      {aiLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
            <div className="text-lg font-semibold text-gray-800">Generating your resume draft…</div>
            <div className="text-sm text-gray-500">This usually takes a few seconds.</div>
            {aiError && <div className="mt-2 text-sm text-red-600 max-w-xs text-center">{aiError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
