import React, { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { getAllReferee, logReferenceRelationship, generateAppreciationMessage } from "../../api/reference";
import type { GetRefereeResponse } from "../../api/reference";
import type { Job } from "../../types/jobs.types";
import {
  attachReferencesToJob,
  detachReferenceFromJob,
  updateReferenceStatus,
  generateReferenceRequest,
  generateReferencePrep,
  updateReferenceFeedback,
} from "../../api/reference";

type Rating = "" | "strong_positive" | "positive" | "neutral" | "mixed" | "negative";
type Source = "" | "recruiter" | "hiring_manager" | "other";

export default function ReferencesPanel({
  job,
  token,
  onJobChange,
  onUpdate,
}: {
  job: Job;
  token: string;
  onJobChange: (updated: Job) => void;
  onUpdate?: () => void;
}) {
  const [allReferences, setAllReferences] = useState<GetRefereeResponse[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);

  // Attach modal
  const [showRefModal, setShowRefModal] = useState(false);
  const [refSelection, setRefSelection] = useState<string[]>([]);

  // Request modal
  const [showRefRequestModal, setShowRefRequestModal] = useState(false);
  const [activeRefUsage, setActiveRefUsage] = useState<any | null>(null);
  const [requestDraft, setRequestDraft] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeFeedbackUsage, setActiveFeedbackUsage] = useState<any | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<{
    feedback_rating: Rating;
    feedback_source: Source;
    feedback_summary: string;
    feedback_notes: string;
  }>({ feedback_rating: "", feedback_source: "", feedback_summary: "", feedback_notes: "" });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Thanks modal
  const [showRefThanksModal, setShowRefThanksModal] = useState(false);
  const [activeThanksUsage, setActiveThanksUsage] = useState<any | null>(null);
  const [activeThanksRef, setActiveThanksRef] = useState<GetRefereeResponse | null>(null);
  const [thanksMessage, setThanksMessage] = useState("");
  const [thanksLoading, setThanksLoading] = useState(false);
  const [thanksError, setThanksError] = useState<string | null>(null);

  // Prep modal
  const [showRefPrepModal, setShowRefPrepModal] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [refPrep, setRefPrep] = useState<any | null>(null);

  // Load references for user
  useEffect(() => {
    const load = async () => {
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
        setRefsError(e?.message || "Failed to load references.");
      } finally {
        setRefsLoading(false);
      }
    };
    load();
  }, []);

  const referenceSummary = useMemo(() => {
    if (!job?.references || job.references.length === 0)
      return { total: 0, byStatus: { planned: 0, requested: 0, confirmed: 0, declined: 0, completed: 0 } };
    const byStatus = { planned: 0, requested: 0, confirmed: 0, declined: 0, completed: 0 } as const;
    const tmp: any = { ...byStatus };
    for (const u of job.references as any[]) {
      if (tmp[u.status] !== undefined) tmp[u.status]++;
    }
    return { total: job.references.length, byStatus: tmp };
  }, [job?.references]);

  const toggleRefSelection = (id: string) =>
    setRefSelection(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleAttachReferences = async () => {
    if (!job?._id || refSelection.length === 0) {
      setShowRefModal(false);
      return;
    }
    try {
      const existingIds = job.references?.map((u: any) => u.reference_id) ?? [];
      const finalIds = Array.from(new Set([...existingIds, ...refSelection]));
      const updated = await attachReferencesToJob({ job_id: job._id, referenceIds: finalIds, token });
      onJobChange(updated);
      setShowRefModal(false);
      setRefSelection([]);
      onUpdate?.();
    } catch (e) {
      alert("Failed to attach references. Please try again.");
    }
  };

  const handleDetachReference = async (referenceId: string) => {
    if (!job?._id) return;
    try {
      const updated = await detachReferenceFromJob({ job_id: job._id, referenceId, token });
      onJobChange(updated);
      onUpdate?.();
    } catch {
      alert("Failed to remove reference from this job. Please try again.");
    }
  };

  const handleUpdateReferenceStatus = async (
    reference_id: string,
    status: "planned" | "requested" | "confirmed" | "declined" | "completed"
  ) => {
    if (!job?._id) return;
    try {
      const updated = await updateReferenceStatus({ job_id: job._id, referenceId: reference_id, status, token });
      onJobChange(updated);
      onUpdate?.();
    } catch {
      alert("Failed to update reference status. Please try again.");
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
      const data = await generateReferenceRequest({
        job_id: job._id,
        referenceId: usage.reference_id,
        user_id: uid,
        token,
      });
      setRequestDraft(data.emailTemplate ?? "");
      setPrepNotes(data.prepNotes ?? "");
    } catch (err: any) {
      setRequestError(err?.message || "Failed to generate reference request. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  const openRefPrepModal = async (usage: any) => {
    if (!job?._id) return;
    setShowRefPrepModal(true);
    setPrepLoading(true);
    setPrepError(null);
    setRefPrep(null);
    try {
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid) throw new Error("Missing user session");
      const data = await generateReferencePrep({
        job_id: job._id,
        referenceId: usage.reference_id,
        user_id: uid,
        token,
      });
      setRefPrep(data);
    } catch (err: any) {
      setPrepError(err?.message || "Failed to load preparation guidance.");
    } finally {
      setPrepLoading(false);
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
      await updateReferenceFeedback({
        job_id: job._id,
        referenceId: activeFeedbackUsage.reference_id,
        user_id: uid!,
        token,
        feedback: {
          feedback_rating: feedbackForm.feedback_rating || undefined,
          feedback_source: feedbackForm.feedback_source || undefined,
          feedback_summary: feedbackForm.feedback_summary || undefined,
          feedback_notes: feedbackForm.feedback_notes || undefined,
        },
      });
      // refresh job: simplest is re-fetch parent, but we have route returning updated job in your code.
      // If your backend returns updated job here, set it; otherwise, caller should re-fetch.
      // For compatibility, we’ll optimistically close modal:
      setShowFeedbackModal(false);
      setActiveFeedbackUsage(null);
      onUpdate?.();
    } catch (err: any) {
      setFeedbackError(err?.message || "Failed to save feedback. Please try again.");
    } finally {
      setFeedbackSaving(false);
    }
  };

  const openThankYouModal = (usage: any) => {
    const ref = allReferences.find(r => r._id === usage.reference_id);
    if (!ref) return;
    setActiveThanksUsage(usage);
    setActiveThanksRef(ref);
    setThanksMessage("");
    setThanksError(null);
    setShowRefThanksModal(true);
  };

  const handleGenerateThankYou = async () => {
    if (!activeThanksRef || !job?._id) return;
    try {
      setThanksLoading(true);
      setThanksError(null);
      const resp = await generateAppreciationMessage({
        reference: activeThanksRef,
        job: { company: job.company, jobTitle: job.jobTitle },
        type: "thank_you",
      });
      setThanksMessage(resp.generated_message || "");
    } catch (err: any) {
      setThanksError(err?.message || "Failed to generate message.");
    } finally {
      setThanksLoading(false);
    }
  };

  const handleSaveThankYou = async () => {
    if (!activeThanksRef || !thanksMessage.trim()) return;
    try {
      setThanksLoading(true);
      setThanksError(null);
      await logReferenceRelationship({
        referenceId: activeThanksRef._id,
        action: "sent_thank_you",
        message_content: thanksMessage,
      });
      // refresh references in side panel
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (uid) {
        const res = await getAllReferee({ user_id: uid });
        setAllReferences(res.referees ?? []);
      }
      setShowRefThanksModal(false);
      setActiveThanksUsage(null);
      setActiveThanksRef(null);
    } catch (err: any) {
      setThanksError(err?.message || "Failed to save thank-you entry.");
    } finally {
      setThanksLoading(false);
    }
  };

  // ---- UI helpers
  const renderFeedbackPill = (rating?: string) => {
    if (!rating) return null;
    let label = "", classes = "px-2 py-0.5 rounded-full text-[11px] border ";
    switch (rating) {
      case "strong_positive": label = "Strong positive"; classes += "bg-emerald-50 text-emerald-700 border-emerald-200"; break;
      case "positive": label = "Positive"; classes += "bg-green-50 text-green-700 border-green-200"; break;
      case "neutral": label = "Neutral"; classes += "bg-gray-50 text-gray-700 border-gray-200"; break;
      case "mixed": label = "Mixed"; classes += "bg-amber-50 text-amber-700 border-amber-200"; break;
      case "negative": label = "Negative"; classes += "bg-red-50 text-red-700 border-red-200"; break;
      default: return null;
    }
    return <span className={classes}>{label}</span>;
  };

  // ---- render
  return (
    <section>
      <div className="flex justify-between items-center mb-1">
        <div>
          <h3 className="font-semibold text-lg">References</h3>
          {referenceSummary.total > 0 && (
            <p className="text-xs text-gray-600 mt-0.5">
              {referenceSummary.total} attached • {referenceSummary.byStatus.confirmed} confirmed • {referenceSummary.byStatus.completed} completed
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setRefSelection([]);
            setShowRefModal(true);
          }}
        >
          + Attach References
        </Button>
      </div>

      <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
        {refsLoading && <p className="text-gray-500">Loading your references…</p>}
        {refsError && <p className="text-red-600">{refsError}</p>}

        {!refsLoading && !refsError && (!job.references || job.references.length === 0) && (
          <p className="text-gray-500">No references attached to this application yet.</p>
        )}

        {!refsLoading && !refsError && job.references && job.references.length > 0 && (
          <ul className="space-y-2">
            {job.references.map((usage: any) => {
              const ref = allReferences.find(r => r._id === usage.reference_id);
              return (
                <li key={usage._id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{ref?.full_name || "Unknown reference"}</span>
                    <span className="text-xs text-gray-600">
                      {ref?.title || ""}{ref?.organization && ` • ${ref.organization}`}
                    </span>
                    {ref?.relationship && (
                      <span className="text-[11px] text-indigo-700">{ref.relationship}</span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select
                        value={usage.status}
                        onChange={(e) => handleUpdateReferenceStatus(usage.reference_id, e.target.value as any)}
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

                      <button
                        type="button"
                        onClick={() => openRefPrepModal(usage)}
                        className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                      >
                        Prep / Talking points
                      </button>

                      <button
                        type="button"
                        onClick={() => openFeedbackModal(usage)}
                        className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                      >
                        Log feedback
                      </button>

                      {usage.status === "completed" && (
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                          onClick={() => openThankYouModal(usage)}
                        >
                          Send thank-you
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDetachReference(usage.reference_id)}
                        className="mt-1 px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                      >
                        Remove from this job
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {usage.requested_at && (
                        <span className="text-gray-500">
                          Req: {new Date(usage.requested_at).toLocaleDateString()}
                        </span>
                      )}
                      {renderFeedbackPill(usage.feedback_rating)}
                    </div>

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

      {/* Attach modal */}
      {showRefModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10001]">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Attach References to Application</h3>
              <button type="button" onClick={() => setShowRefModal(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            {refsLoading && <p className="text-gray-500 text-sm">Loading references…</p>}

            {!refsLoading && allReferences.length === 0 && (
              <p className="text-gray-500 text-sm">You don’t have any references yet.</p>
            )}

            {!refsLoading && allReferences.length > 0 && job && (
              <AttachList
                job={job}
                allReferences={allReferences}
                refSelection={refSelection}
                setRefSelection={setRefSelection}
              />
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => { setShowRefModal(false); setRefSelection([]); }}>Cancel</Button>
              <Button variant="primary" onClick={handleAttachReferences} disabled={refSelection.length === 0}>
                Attach {refSelection.length || ""} selected
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Request modal */}
      {showRefRequestModal && activeRefUsage && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Reference Request Template</h3>
              <button type="button" onClick={() => { setShowRefRequestModal(false); setActiveRefUsage(null); }} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            {requestLoading && <p className="text-sm text-gray-500 mb-3">Generating request and prep notes…</p>}
            {requestError && <p className="text-sm text-red-600 mb-3">{requestError}</p>}

            <section className="mb-4">
              <h4 className="font-semibold text-sm mb-1">Email to your reference</h4>
              <textarea value={requestDraft} onChange={(e) => setRequestDraft(e.target.value)} rows={8} className="w-full form-input text-sm" />
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => navigator.clipboard.writeText(requestDraft)} className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Copy email
                </button>
              </div>
            </section>

            <section className="mb-4">
              <h4 className="font-semibold text-sm mb-1">Role-specific talking points</h4>
              <textarea value={prepNotes} onChange={(e) => setPrepNotes(e.target.value)} rows={6} className="w-full form-input text-sm" />
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => navigator.clipboard.writeText(prepNotes)} className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Copy notes
                </button>
              </div>
            </section>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={() => { setShowRefRequestModal(false); setActiveRefUsage(null); }}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedbackModal && activeFeedbackUsage && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
          <Card className="w-full max-w-xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Log Reference Feedback</h3>
              <button type="button" onClick={() => { setShowFeedbackModal(false); setActiveFeedbackUsage(null); }} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>

            {feedbackError && <p className="text-sm text-red-600 mb-2">{feedbackError}</p>}

            <div className="space-y-3 text-sm">
              <div>
                <label className="form-label text-sm">Overall feedback rating</label>
                <select
                  value={feedbackForm.feedback_rating}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_rating: e.target.value as Rating }))}
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

              <div>
                <label className="form-label text-sm">Who shared this feedback?</label>
                <select
                  value={feedbackForm.feedback_source}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_source: e.target.value as Source }))}
                  className="w-full form-input"
                >
                  <option value="">Select source</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label text-sm">Short summary</label>
                <input
                  type="text"
                  value={feedbackForm.feedback_summary}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_summary: e.target.value }))}
                  maxLength={180}
                  className="w-full form-input"
                  placeholder='e.g. "Strong team player, great communication."'
                />
              </div>

              <div>
                <label className="form-label text-sm">Detailed notes (optional)</label>
                <textarea
                  value={feedbackForm.feedback_notes}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_notes: e.target.value }))}
                  rows={4}
                  className="w-full form-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => { setShowFeedbackModal(false); setActiveFeedbackUsage(null); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveFeedback} disabled={feedbackSaving}>
                {feedbackSaving ? "Saving..." : "Save feedback"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Prep modal */}
      {showRefPrepModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Reference Talking Points</h3>
              <button
                type="button"
                onClick={() => { setShowRefPrepModal(false); setRefPrep(null); setPrepError(null); }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {prepLoading && <p className="text-sm text-gray-500 mb-2">Generating guidance…</p>}
            {prepError && <p className="text-sm text-red-600 mb-2">{prepError}</p>}

            {refPrep && (
              <div className="space-y-4 text-sm text-gray-800">
                <section>
                  <h4 className="font-semibold mb-1">Overview</h4>
                  <p>{refPrep.overview}</p>
                </section>
                {!!refPrep.keyStrengths?.length && (
                  <section>
                    <h4 className="font-semibold mb-1">Key strengths to emphasize</h4>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {refPrep.keyStrengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </section>
                )}
                {!!refPrep.projectsToHighlight?.length && (
                  <section>
                    <h4 className="font-semibold mb-1">Projects to highlight</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {refPrep.projectsToHighlight.map((p: any, i: number) => (
                        <li key={i}><span className="font-medium">{p.name}:</span> <span>{p.whyItMatters}</span></li>
                      ))}
                    </ul>
                  </section>
                )}
                {!!refPrep.riskAreas?.length && (
                  <section>
                    <h4 className="font-semibold mb-1">Potential risk areas & how to frame them</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {refPrep.riskAreas.map((r: any, i: number) => (
                        <li key={i}><span className="font-medium">{r.topic}:</span> <span>{r.howToFrame}</span></li>
                      ))}
                    </ul>
                  </section>
                )}
                {!!refPrep.dontSayList?.length && (
                  <section>
                    <h4 className="font-semibold mb-1">Things to avoid saying</h4>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {refPrep.dontSayList.map((d: string, i: number) => <li key={i}>{d}</li>)}
                    </ul>
                  </section>
                )}
                {refPrep.callScript90s && (
                  <section>
                    <h4 className="font-semibold mb-1">90-second phone reference script</h4>
                    <div className="bg-gray-50 rounded p-3 whitespace-pre-wrap text-sm">{refPrep.callScript90s}</div>
                  </section>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `${refPrep.overview || ""}\n\nKey strengths:\n${(refPrep.keyStrengths || []).join(
                          "\n"
                        )}\n\nProjects:\n${(refPrep.projectsToHighlight || [])
                          .map((p: any) => `${p.name}: ${p.whyItMatters}`)
                          .join("\n")}\n\nCall script:\n${refPrep.callScript90s || ""}`
                      );
                    }}
                  >
                    Copy all
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Thanks modal */}
      {showRefThanksModal && activeThanksRef && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[10002]">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Thank Your Reference</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRefThanksModal(false);
                  setActiveThanksUsage(null);
                  setActiveThanksRef(null);
                  setThanksError(null);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {thanksError && <p className="text-sm text-red-600 mb-2">{thanksError}</p>}

              <div className="flex justify-between items-center">
                <span className="text-gray-700">Generate a thank-you message</span>
                <Button type="button" variant="secondary" onClick={handleGenerateThankYou} disabled={thanksLoading}>
                  {thanksLoading ? "Generating..." : "Generate"}
                </Button>
              </div>

              <div>
                <label className="form-label text-sm">Message</label>
                <textarea
                  rows={6}
                  className="form-input w-full"
                  placeholder="Your thank-you message will appear here..."
                  value={thanksMessage}
                  onChange={(e) => setThanksMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={() => thanksMessage && navigator.clipboard?.writeText(thanksMessage)}>
                Copy
              </Button>
              <Button type="button" onClick={handleSaveThankYou} disabled={thanksLoading || !thanksMessage.trim()}>
                {thanksLoading ? "Saving..." : "Save as interaction"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

function AttachList({
  job,
  allReferences,
  refSelection,
  setRefSelection,
}: {
  job: Job;
  allReferences: GetRefereeResponse[];
  refSelection: string[];
  setRefSelection: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const attachedIds = new Set((job.references ?? []).map((u: any) => u.reference_id));
  const availableRefs = allReferences.filter(ref => !attachedIds.has(ref._id));

  const toggle = (id: string) => {
    setRefSelection(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (availableRefs.length === 0) {
    return <p className="text-xs text-gray-600">All of your references are already attached to this job.</p>;
  }

  // simple “recommendation” scoring (same as your inline logic)
  const rawJobType = (job.type || "").toString().toLowerCase();
  const normalizedJobType =
    rawJobType.includes("intern") ? "internship" :
    rawJobType.includes("full") ? "full-time" :
    rawJobType.includes("part") ? "part-time" :
    rawJobType.includes("contract") ? "contract" :
    rawJobType.includes("free") ? "freelance" : rawJobType;

  const scored = availableRefs.map(ref => {
    const types = Array.isArray(ref.preferred_opportunity_types)
      ? ref.preferred_opportunity_types.map(t => t.toString().toLowerCase())
      : [];
    const matchesType = normalizedJobType && types.some(t => {
      if (normalizedJobType === "internship") return t.includes("intern");
      if (normalizedJobType === "full-time") return t.includes("full");
      if (normalizedJobType === "part-time") return t.includes("part");
      if (normalizedJobType === "contract") return t.includes("contract");
      if (normalizedJobType === "freelance") return t.includes("free");
      return t === normalizedJobType;
    });

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

    return { ref, matchesType, unavailable, overPreferred, score };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
      {scored.map(({ ref, matchesType, unavailable, overPreferred }) => {
        const id = ref._id;
        const isSelected = refSelection.includes(id);
        const isRecommended = matchesType && !unavailable && !overPreferred;
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`w-full text-left border rounded px-3 py-2 text-sm flex justify-between items-center
              ${isSelected ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <div>
              <div className="font-medium">{ref.full_name || "Unnamed reference"}</div>
              <div className="text-xs text-gray-600">
                {ref.title}{ref.organization && ` • ${ref.organization}`}
              </div>
              {ref.relationship && <div className="text-[11px] text-indigo-700">{ref.relationship}</div>}
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

            <div className="text-[11px] text-gray-500 text-right">
              {ref.usage_count != null && (
                <div>Used in {ref.usage_count} {ref.usage_count === 1 ? "application" : "applications"}</div>
              )}
              {ref.preferred_number_of_uses != null && <div>Pref: {ref.preferred_number_of_uses} uses</div>}
              {ref.last_used_at && <div>Last used: {ref.last_used_at}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
