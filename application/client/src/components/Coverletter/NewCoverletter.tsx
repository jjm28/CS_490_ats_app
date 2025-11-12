import { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import { useNavigate } from "react-router-dom";
import { TEMPLATES } from "./Coverletterstore";
import { GetmostpopularCoverletter } from "../../api/coverletter";
import JobPickerSheet from "./JobPickerSheet";
import { useJobs } from "./hooks/useJobs";
import MiniJobForm from "./MiniJobForm";
import type { JobDraft } from "./MiniJobForm";
import { type GetCoverletterResponse, GetAiGeneratedContent } from "../../api/coverletter";

export default function NewCoverletter() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [mostpop, setMostpop] = useState<string | null>(null);
  const [chooseMode, setChooseMode] = useState(false);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const { jobs, loading: jobsLoading, err: jobsError, isLoggedIn } = useJobs();
  const [showMiniForm, setShowMiniForm] = useState(false);

  // 🔹 NEW: AI loading + error state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (chooseMode) setChooseMode(false);
        else if (open) setOpen(false);
      }
    };
    if (open || chooseMode) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, chooseMode]);

  useEffect(() => {
    GetmostpopularCoverletter()
      .then((data) => {
        const key = typeof data === "string" ? data : data?.templateKey ?? null;
        if (key) setMostpop(key);
      })
      .catch((err) =>
        console.error("Error fetching most popular cover letter:", err)
      );
  }, []);

  const openChoice = () => {
    if (!active) return;
    setChooseMode(true);
  };

  const handleCreateManual = () => {
    if (!active) return;
    setChooseMode(false);
    setOpen(false);
    navigate("/coverletter/editor", { state: { template: active } });
  };

  const handleGenerateAI = async () => {
    if (!active) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { flash: "Please log in to use AI with your saved jobs." } });
      return;
    }
    setShowJobPicker(true);
    setChooseMode(false);
    setOpen(false);
  };

  const safeGetUser = () => {
    const raw = localStorage.getItem("authUser");
    if (!raw) throw new Error("Not signed in (authUser missing).");
    try {
      const u = JSON.parse(raw);
      if (!u?._id) throw new Error("authUser is missing _id.");
      return u;
    } catch {
      throw new Error("authUser in localStorage is not valid JSON.");
    }
  };

  const handlePickJob = async (job: import("./hooks/useJobs").Job) => {
    setShowJobPicker(false);
    setOpen(false);
    setAiError(null);
    setAiLoading(true);
    try {
      const user = safeGetUser();
      const data = await GetAiGeneratedContent({ userid: user._id, Jobdata: job });
      navigate("/coverletter/editor", {
        state: {
          template: active,
          AImode: true,
          GeminiCoverletter: data,
        },
      });
    } catch (e: any) {
      setAiError(e?.message ?? String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handleEnterJobManual = () => {
    setShowJobPicker(false);
    setOpen(false);
    setShowMiniForm(true);
  };

  const handleMiniFormSubmit = async (draft: JobDraft) => {
    setShowMiniForm(false);
    setAiError(null);
    setAiLoading(true);
    try {
      const user = safeGetUser();
      const data = await GetAiGeneratedContent({ userid: user._id, Jobdata: draft });
      navigate("/coverletter/editor", {
        state: {
          template: active,
          AImode: true,
          GeminiCoverletter: data,
        },
      });
    } catch (e: any) {
      setAiError(e?.message ?? String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handlePreview = (t: (typeof TEMPLATES)[number]) => {
    setActive(t);
    setOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <h1 className="text-2xl font-semibold text-center mb-8">
        Select a cover letter template
      </h1>

      {/* Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${aiLoading ? "opacity-50 pointer-events-none" : ""}`}>
        {TEMPLATES.map((t) => {
          const isMostPopular = mostpop === t.key;
          return (
            <Card
              key={t.key}
              className="relative overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col"
            >
              {isMostPopular && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-500/90 text-white text-[11px] font-semibold px-3 py-1 shadow">
                  Most popular
                </span>
              )}

              <div className="w-full aspect-3/4 overflow-hidden">
                <img
                  src={t.img}
                  alt={t.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-2">{t.title}</h2>
                <p className="text-sm text-gray-600 flex-1">{t.blurb}</p>
                <button
                  onClick={() => handlePreview(t)}
                  className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  disabled={aiLoading}
                >
                  Preview
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Display jobs or enter manually */}
      <JobPickerSheet
        open={showJobPicker}
        onClose={() => setShowJobPicker(false)}
        jobs={jobs}
        loading={jobsLoading}
        error={jobsError}
        onPickJob={handlePickJob}
        onEnterManual={handleEnterJobManual}
      />
      <MiniJobForm
        open={showMiniForm}
        onCancel={() => setShowMiniForm(false)}
        onSubmit={handleMiniFormSubmit}
      />

      {/* Modal */}
      {open && active && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-[92vw] max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col outline-none">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200/70">
              <h3 className="text-lg font-semibold">{active.title}</h3>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
              <div className="rounded-lg bg-white overflow-hidden">
                <img
                  src={active.img}
                  alt={`${active.title} preview`}
                  className="block w-full h-auto select-none"
                />
              </div>
              {active.blurb && (
                <p className="text-sm text-gray-600 mt-3">{active.blurb}</p>
              )}
            </div>

            <div className="shrink-0 sticky bottom-0 px-4 md:px-6 py-3 border-t border-gray-200/70 bg-white">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={openChoice}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={aiLoading}
                >
                  Select Template
                </button>
              </div>
            </div>
          </div>

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
                    <div className="text-xs text-gray-600">
                      Start with a template with sample content and edit it yourself.
                    </div>
                  </button>

                  <button
                    onClick={handleGenerateAI}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-left text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={aiLoading}
                  >
                    <div className="font-medium">Generate with AI</div>
                    <div className="text-xs opacity-90">
                      We’ll draft a first version tailored to your job application.
                    </div>
                  </button>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setChooseMode(false)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🔹 FULL-SCREEN LOADING OVERLAY */}
      {aiLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
            <div className="text-lg font-semibold text-gray-800">Generating your cover letter…</div>
            <div className="text-sm text-gray-500">This usually takes a few seconds.</div>
            {aiError && (
              <div className="mt-2 text-sm text-red-600 max-w-xs text-center">
                {aiError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
