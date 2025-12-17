// src/components/Teams/TeamReviewPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getTeamById,
  getTeamSharedDocs,
  addSharedDocComment,
  resolveSharedDocComment,
  exportTeamResume,
  exportTeamCoverletter,
  getSharedDocComments,
  type TeamWithMembers,
  type CandidateSharedDocs,
  type SharedDocComment,
} from "../../api/teams";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { resumePdfRegistry } from "../Resume";
import { pdfRegistry as coverletterPdfRegistry } from "../Coverletter";
import { handleError } from "../../utils/errorHandler";

type DocKind = "resume" | "coverletter";

type ExportCache = {
  resumes: Record<string, any>;
  coverletters: Record<string, any>;
};

// Safely normalize resume structure
const safeResumeData = (data: any = {}) => ({
  contact: data.contact || { name: "", email: "", phone: "" },
  summary: data.summary || "",
  education: Array.isArray(data.education) ? data.education : [],
  experience: Array.isArray(data.experience) ? data.experience : [],
  projects: Array.isArray(data.projects) ? data.projects : [],
  skills: Array.isArray(data.skills) ? data.skills : [],
  certifications: Array.isArray(data.certifications)
    ? data.certifications
    : [],
  theme: data.theme || "default",
  ...data,
});

// Safely normalize cover letter structure
const safeCoverletterData = (data: any = {}) => ({
  name: data.name || "",
  phonenumber: data.phonenumber || "",
  email: data.email || "",
  address: data.address || "",
  date: data.date || "",
  recipientLines: Array.isArray(data.recipientLines)
    ? data.recipientLines
    : [],
  greeting: data.greeting || "",
  paragraphs: Array.isArray(data.paragraphs) ? data.paragraphs : [],
  closing: data.closing || "",
  signatureNote: data.signatureNote || "",
});

const TeamReviewPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<TeamWithMembers["team"] | null>(null);
  const [shared, setShared] = useState<CandidateSharedDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const [exportCache, setExportCache] = useState<ExportCache>({
    resumes: {},
    coverletters: {},
  });
  const [exportLoadingId, setExportLoadingId] = useState<string | null>(null);

  const [comments, setComments] = useState<SharedDocComment[]>([]);
  const [selectedSharedId, setSelectedSharedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"resume" | "coverletter">("resume");
  // Load team + shared docs
  const load = async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [teamData, sharedDocs] = await Promise.all([
        getTeamById(teamId),
        getTeamSharedDocs(teamId),
      ]);
      setTeam(teamData.team);
      setShared(sharedDocs);
    } catch (err: any) {
      handleError(err);
      console.error("Error loading team review:", err);
      setError(err?.message || "Failed to load shared documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [teamId]);

  useEffect(() => {
  if (!selectedSharedId) return;

  const id = selectedSharedId; // now `id` is definitely a string here

  async function loadComments(selectedId: string | null) {
  // don’t call API if we’re missing IDs
  if (!teamId || !selectedId) return;

  const res = await getSharedDocComments(selectedId, selectedKind);
  setComments(res.comments || []);
  }

  loadComments(id);
}, [selectedSharedId]);

  

  const handleCommentChange = (docKey: string, text: string) => {
    setNewComments((prev) => ({ ...prev, [docKey]: text }));
  };

  

  const handleAddComment = async (kind: DocKind, sharedId: string) => {
  const key = `${kind}:${sharedId}`;
  const text = (newComments[key] || "").trim();
  if (!text) return;

  try {
    setBusyDocId(sharedId);

    // ✅ Send comment with doc kind
    const resp = await addSharedDocComment(sharedId, kind, text);

    // ✅ Use returned comments if present, otherwise fetch
    const freshComments =
      resp.comments ||
      (await getSharedDocComments(sharedId, kind)).comments ||
      [];

    // ✅ Update local shared docs state so the UI shows new comments
    setShared((prev) =>
      prev.map((entry) => ({
        ...entry,
        sharedDocs: {
          ...entry.sharedDocs,
          resumes:
            kind === "resume"
              ? entry.sharedDocs.resumes.map((r) =>
                  (r._id as any).toString() === sharedId
                    ? { ...r, comments: freshComments }
                    : r
                )
              : entry.sharedDocs.resumes,
          coverletters:
            kind === "coverletter"
              ? entry.sharedDocs.coverletters.map((cl) =>
                  (cl._id as any).toString() === sharedId
                    ? { ...cl, comments: freshComments }
                    : cl
                )
              : entry.sharedDocs.coverletters,
          profiles: entry.sharedDocs.profiles,
        },
      }))
    );

    setNewComments((prev) => ({ ...prev, [key]: "" }));
    window.alert("✅ Your comment has been sent!");
  } catch (err) {
    handleError(err);
    console.error("Error adding comment:", err);
    window.alert("❌ Failed to send comment. Please try again.");
  } finally {
    setBusyDocId(null);
  }
};


  const handleResolveComment = async (
    kind: DocKind,
    sharedId: string,
    comment: SharedDocComment
  ) => {
    if (!comment._id) return;
    try {
      setBusyDocId(sharedId);
      await resolveSharedDocComment({
        sharedId,
        commentId: comment._id,
        type: kind,
        resolved: true,
      });

      setShared((prev) =>
        prev.map((c) => ({
          ...c,
          sharedDocs: {
            ...c.sharedDocs,
            resumes:
              kind === "resume"
                ? c.sharedDocs.resumes.map((r) =>
                    (r._id as any).toString() === sharedId
                      ? {
                          ...r,
                          comments: (r.comments || []).map((cm) =>
                            cm._id === comment._id
                              ? { ...cm, resolved: true }
                              : cm
                          ),
                        }
                      : r
                  )
                : c.sharedDocs.resumes,
            coverletters:
              kind === "coverletter"
                ? c.sharedDocs.coverletters.map((cl) =>
                    (cl._id as any).toString() === sharedId
                      ? {
                          ...cl,
                          comments: (cl.comments || []).map((cm) =>
                            cm._id === comment._id
                              ? { ...cm, resolved: true }
                              : cm
                          ),
                        }
                      : cl
                  )
                : c.sharedDocs.coverletters,
            profiles: c.sharedDocs.profiles,
          },
        }))
      );
    } catch (err) {
      handleError(err);
      console.error("Error resolving comment:", err);
      setError("Failed to resolve comment.");
    } finally {
      setBusyDocId(null);
    }
  };

  // ---------------------------
  // Export helpers
  // ---------------------------
  const ensureResumeExportData = async (resumeId: string) => {
    if (!teamId || exportCache.resumes[resumeId]) return;
    try {
      setExportLoadingId(resumeId);
      const { resume } = await exportTeamResume(teamId, resumeId);
      setExportCache((prev) => ({
        ...prev,
        resumes: { ...prev.resumes, [resumeId]: resume },
      }));
    } catch (err) {
      handleError(err);
      console.error("Error fetching resume export data:", err);
      setError("Failed to prepare resume for export.");
    } finally {
      setExportLoadingId(null);
    }
  };

  const ensureCoverletterExportData = async (coverletterId: string) => {
    if (!teamId || exportCache.coverletters[coverletterId]) return;
    try {
      setExportLoadingId(coverletterId);
      const { coverletter } = await exportTeamCoverletter(teamId, coverletterId);
      setExportCache((prev) => ({
        ...prev,
        coverletters: {
          ...prev.coverletters,
          [coverletterId]: coverletter,
        },
      }));
    } catch (err) {
      handleError(err);
      console.error("Error fetching cover letter export data:", err);
      setError("Failed to prepare cover letter for export.");
    } finally {
      setExportLoadingId(null);
    }
  };

  // ---------------------------
  // Render comments
  // ---------------------------
  const renderComments = (
    kind: DocKind,
    sharedId: string,
    comments: SharedDocComment[] | undefined
  ) => {
    const key = `${kind}:${sharedId}`;
    const value = newComments[key] || "";

    const list = (comments || []).filter(Boolean);

    return (
      <div className="mt-3 space-y-2">
        <h4 className="text-xs font-semibold text-gray-700">
          Coach Feedback
        </h4>

        {list.length === 0 ? (
          <p className="text-xs text-gray-500">
            No comments yet. Add your first suggestion below.
          </p>
        ) : (
          <ul className="space-y-1">
            {list.map((c) => (
              <li
                key={c._id}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <p
                    className={
                      c.resolved
                        ? "text-gray-400 line-through"
                        : "text-gray-800"
                    }
                  >
                    {c.text}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleString()
                      : ""}
                    {c.resolved && " · resolved"}
                  </p>
                </div>
                {!c.resolved && (
                  <button
                    type="button"
                    className="text-[10px] text-teal-600 hover:underline"
                    onClick={() =>
                      handleResolveComment(kind, sharedId, c)
                    }
                  >
                    Mark resolved
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <textarea
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={2}
            placeholder="Suggest phrasing improvements, missing details, or formatting fixes…"
            value={value}
            onChange={(e) => handleCommentChange(key, e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busyDocId === sharedId || !value.trim()}
            onClick={() => handleAddComment(kind, sharedId)}
          >
            {busyDocId === sharedId ? "Saving…" : "Add Comment"}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Loading shared documents…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          {team?.name || "Team Review"}
        </h1>
        <Button onClick={() => navigate(`/teams/${teamId}`)}>
          Back to Team
        </Button>
      </div>

      {shared.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            No candidates have shared information yet.
          </p>
        </Card>
      ) : (
        shared.map((entry) => {
          const { candidate, sharedDocs } = entry;
          return (
            <Card key={candidate.id}>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                {candidate.name || candidate.email || "Candidate"}
              </h2>

              {/* RESUMES */}
              {sharedDocs.resumes?.length > 0 && (
                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-800">
                    Shared Resumes
                  </h3>
                  {sharedDocs.resumes.map((r) => {
                    const id = (r._id as any).toString();
                    const Pdf = r.templateKey
                      ? (resumePdfRegistry as any)[r.templateKey]
                      : null;
                    const exported = exportCache.resumes[id];
                    const resumeData =
                      exported &&
                      safeResumeData(
                        exported.resumeData ??
                          exported.resumedata ??
                          exported
                      );
                    return (
                      <div
                        key={id}
                        className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-medium text-gray-900">
                            {r.filename || "Resume"}
                          </p>
                          {Pdf && resumeData ? (
                            <PDFDownloadLink
                              document={<Pdf data={resumeData} />}
                              fileName={`${r.filename || "resume"}.pdf`}
                            >
                              {({ loading }) => (
                                <button
                                  className="text-[11px] text-blue-600 hover:underline"
                                  disabled={loading}
                                >
                                  {loading
                                    ? "Preparing PDF…"
                                    : "Download PDF"}
                                </button>
                              )}
                            </PDFDownloadLink>
                          ) : (
                            Pdf && (
                              <button
                                className="text-[11px] text-blue-600 hover:underline"
                                onClick={() => void ensureResumeExportData(id)}
                                disabled={exportLoadingId === id}
                              >
                                {exportLoadingId === id
                                  ? "Preparing data…"
                                  : "Enable PDF Download"}
                              </button>
                            )
                          )}
                        </div>

                        {renderComments("resume", id, r.comments)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COVER LETTERS */}
              {sharedDocs.coverletters?.length > 0 && (
                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-800">
                    Shared Cover Letters
                  </h3>
                  {sharedDocs.coverletters.map((cl) => {
                    const id = (cl._id as any).toString();
                    const Pdf =
                      cl.templateKey &&
                      (coverletterPdfRegistry as any)[cl.templateKey];
                    const exported = exportCache.coverletters[id];
                    const coverletterData =
                      exported &&
                      safeCoverletterData(
                        exported.coverletterData ??
                          exported.coverletterdata ??
                          exported
                      );
                    return (
                      <div
                        key={id}
                        className="border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-medium text-gray-900">
                            {cl.filename || "Cover Letter"}
                          </p>
                          {Pdf && coverletterData ? (
                            <PDFDownloadLink
                              document={<Pdf {...coverletterData} />}
                              fileName={`${cl.filename || "coverletter"}.pdf`}
                            >
                              {({ loading }) => (
                                <button
                                  className="text-[11px] text-blue-600 hover:underline"
                                  disabled={loading}
                                >
                                  {loading
                                    ? "Preparing PDF…"
                                    : "Download PDF"}
                                </button>
                              )}
                            </PDFDownloadLink>
                          ) : (
                            Pdf && (
                              <button
                                className="text-[11px] text-blue-600 hover:underline"
                                onClick={() =>
                                  void ensureCoverletterExportData(id)
                                }
                                disabled={exportLoadingId === id}
                              >
                                {exportLoadingId === id
                                  ? "Preparing data…"
                                  : "Enable PDF Download"}
                              </button>
                            )
                          )}
                        </div>

                        {renderComments("coverletter", id, cl.comments)}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default TeamReviewPage;
