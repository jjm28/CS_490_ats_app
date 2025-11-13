import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import Button from "../StyledComponents/Button";
import {
  resumePreviewRegistry,
  resumePdfRegistry,
} from "../../components/Resume";
import type { ResumeData, TemplateKey } from "../../api/resumes";

const API =
  (import.meta as any).env?.VITE_API_URL ||
  `${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

function getAuthHeaders() {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  const token = (u?.token || localStorage.getItem("token") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

/** --- Types for sharing + comments / feedback --- */

type SharingMeta = {
  ownerName?: string;
  ownerEmail?: string;
  visibility?: "public" | "unlisted" | "restricted";
  allowComments?: boolean;
  canComment?: boolean; // this specific viewer can comment or not
  isOwner?: boolean; // is the current viewer the owner
};

type ResumeFeedbackComment = {
  _id: string;
  authorName: string;
  authorRole?: string;
  message: string;
  createdAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedByName?: string;
};

export default function ResumeShareView() {
  const [sp] = useSearchParams();
  const sharedid = sp.get("sharedid");

  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("Untitled");
  const [templateKey, setTemplateKey] = useState<TemplateKey>("chronological");
  const [data, setData] = useState<ResumeData>({
    name: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // NEW: sharing + feedback state
  const [sharingMeta, setSharingMeta] = useState<SharingMeta | null>(null);
  const [comments, setComments] = useState<ResumeFeedbackComment[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        if (!sharedid) {
          setErr("Missing shared id.");
          setLoading(false);
          return;
        }
        setLoading(true);
                      const raw = localStorage.getItem("authUser");
                    const u = raw ? JSON.parse(raw) : null;
                    const uid = u?.user?._id ?? u?._id ?? null;
        const res = await fetch(
        `${API}/resumes/shared/${encodeURIComponent(uid)}/${encodeURIComponent(sharedid)}`,
          {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
          }
        );
        if (res.status === 404) {
          setErr("Shared resume not found.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || res.statusText);
        }
        const payload = await res.json();

        // resume core
        setFilename(payload?.filename ?? "Untitled");
        setTemplateKey((payload?.templateKey as TemplateKey) ?? "chronological");
        setData((payload?.resumedata ?? {}) as ResumeData);
        setLastSaved(payload?.lastSaved ?? null);

        // NEW: sharing + comments
        setSharingMeta(
          (payload?.sharing || {
            visibility: "unlisted",
            allowComments: true,
          }) as SharingMeta
        );
        setComments((payload?.comments || []) as ResumeFeedbackComment[]);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load shared resume.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sharedid]);

  const PreviewComponent = useMemo(
    () =>
      resumePreviewRegistry[templateKey] ??
      resumePreviewRegistry.chronological,
    [templateKey]
  );
  const PdfComponent = useMemo(
    () => resumePdfRegistry[templateKey] ?? resumePdfRegistry.chronological,
    [templateKey]
  );

  // In your setup this was fixed to spread props instead of {data}
  const pdfDoc = useMemo(() => <PdfComponent data={{
    name: "",
    summary: undefined,
    experience: undefined,
    education: undefined,
    skills: undefined,
    projects: undefined,
    style: undefined
  }} {...data} />, [PdfComponent, data]);

  const handleExportJson = async () => {
    const payload = {
      filename,
      templateKey,
      resumedata: { ...data },
      lastSaved,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "resume"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // NEW: export feedback summary (fulfills "Export feedback summary")
  const handleExportFeedbackSummary = () => {
    const summary = {
      sharedid,
      filename,
      owner: sharingMeta?.ownerName || null,
      visibility: sharingMeta?.visibility || "unlisted",
      totalComments: comments.length,
      comments: comments.map((c) => ({
        id: c._id,
        author: c.authorName,
        role: c.authorRole || null,
        message: c.message,
        createdAt: c.createdAt,
        resolved: !!c.resolved,
        resolvedAt: c.resolvedAt || null,
        resolvedBy: c.resolvedByName || null,
      })),
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "resume"}_feedback.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // NEW: add comment (fulfills "Comment system", "Reviewer access permissions")
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);

    if (!sharedid) {
      setFeedbackError("Missing shared id.");
      return;
    }
    if (!newComment.trim()) {
      setFeedbackError("Please enter feedback before submitting.");
      return;
    }
    if (sharingMeta?.allowComments === false) {
      setFeedbackError("Comments are disabled for this resume.");
      return;
    }
    if (sharingMeta?.canComment === false) {
      setFeedbackError("You do not have permission to comment on this resume.");
      return;
    }

    try {
      setSubmittingComment(true);
      const res = await fetch(
        `${API}/resumes/shared/${encodeURIComponent(sharedid)}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({ message: newComment.trim() }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to submit feedback.");
      }
      const payload = await res.json();
      // backend can return updated comments list or just new comment
      if (Array.isArray(payload?.comments)) {
        setComments(payload.comments as ResumeFeedbackComment[]);
      } else if (payload?.comment) {
        setComments((prev) => [...prev, payload.comment as ResumeFeedbackComment]);
      }
      setNewComment("");
      // NOTE: actual notification (email / in-app) should be handled on backend
    } catch (err: any) {
      setFeedbackError(err?.message ?? "Failed to submit feedback.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // NEW: mark comment resolved / unresolved (for owner)
  const handleToggleResolved = async (commentId: string, resolved: boolean) => {
    if (!sharedid) return;
    if (!sharingMeta?.isOwner) {
      setFeedbackError("Only the resume owner can resolve feedback.");
      return;
    }
    try {
      setUpdatingCommentId(commentId);
      const res = await fetch(
        `${API}/resumes/shared/${encodeURIComponent(
          sharedid
        )}/comments/${encodeURIComponent(commentId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({ resolved }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update comment.");
      }
      const payload = await res.json();
      if (Array.isArray(payload?.comments)) {
        setComments(payload.comments as ResumeFeedbackComment[]);
      } else if (payload?.comment) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? payload.comment : c))
        );
      } else {
        // fallback: update client-side
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? {
                  ...c,
                  resolved,
                  resolvedAt: resolved ? new Date().toISOString() : undefined,
                }
              : c
          )
        );
      }
    } catch (err: any) {
      setFeedbackError(err?.message ?? "Failed to update feedback status.");
    } finally {
      setUpdatingCommentId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-600">Loading shared resume…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  const totalResolved = comments.filter((c) => c.resolved).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Resume (Shared View)</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="filename"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            File name:
          </label>
          <input
            id="filename"
            type="text"
            className="flex-1 max-w-md rounded border px-3 py-2 text-sm"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <div className="flex-1" />
          <Button onClick={handleExportJson}>Export JSON</Button>
          <Button variant="secondary" onClick={handleExportFeedbackSummary}>
            Export Feedback Summary
          </Button>
        </div>

        {/* NEW: privacy / visibility summary (fulfills "Privacy controls") */}
        {sharingMeta && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-700">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
              Visibility:
              <span className="font-semibold capitalize ml-1">
                {sharingMeta.visibility || "unlisted"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
              Comments:
              <span className="font-semibold ml-1">
                {sharingMeta.allowComments ? "Enabled" : "Disabled"}
              </span>
            </span>
            {sharingMeta.ownerName && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
                Owner:
                <span className="font-semibold ml-1">
                  {sharingMeta.ownerName}
                </span>
              </span>
            )}
            {sharingMeta.isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                You are viewing your own shared resume
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-6">
        Loaded template: <strong>{templateKey}</strong>
      </p>

      <Suspense
        fallback={
          <div className="bg-white shadow rounded p-10 text-sm text-gray-500">
            Loading preview…
          </div>
        }
      >
        <PreviewComponent data={data} onEdit={() => {}} />
      </Suspense>

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
            fileName={`${filename || "resume"}.pdf`}
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
          </PDFDownloadLink>
        </Suspense>
      </div>

      {/* NEW: Feedback panel (comments, history, resolution tracking) */}
      <section className="mt-10 border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">Feedback</h2>
            <p className="text-xs text-gray-500">
              Share this page with mentors or career coaches to gather comments.
            </p>
          </div>
          <div className="text-xs text-gray-600 flex flex-col items-end">
            <span>
              {comments.length
                ? `${comments.length} comment${
                    comments.length > 1 ? "s" : ""
                  } (${totalResolved} resolved)`
                : "No feedback yet"}
            </span>
            {sharingMeta?.allowComments && (
              <span className="text-[11px] text-gray-400">
                Submitting feedback may notify the resume owner.
              </span>
            )}
          </div>
        </div>

        {feedbackError && (
          <div className="mb-2 text-xs text-red-600">{feedbackError}</div>
        )}

        {/* New comment form */}
        {sharingMeta?.allowComments ? (
          <form onSubmit={handleSubmitComment} className="mb-4 space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Leave feedback
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder={
                sharingMeta?.canComment === false
                  ? "You don't have permission to comment on this resume."
                  : "Be specific and constructive – call out strengths and areas to improve."
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={
                submittingComment || sharingMeta?.canComment === false
              }
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-gray-500">
                Tip: Focus on clarity, impact, and alignment with target roles.
              </span>
              <Button
                type="submit"
                disabled={
                  submittingComment ||
                  sharingMeta?.canComment === false ||
                  !newComment.trim()
                }
              >
                {submittingComment ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mb-4 text-xs text-gray-500">
            Comments are disabled for this shared resume.
          </p>
        )}

        {/* Feedback history list */}
        <div className="border-t pt-3">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-500">
              No feedback yet. Share this link with a mentor, recruiter, or
              career coach to get comments.
            </p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {comments.map((c) => {
                const isResolved = !!c.resolved;
                return (
                  <li
                    key={c._id}
                    className="border rounded-md px-3 py-2 text-sm bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {c.authorName || "Reviewer"}
                          {c.authorRole && (
                            <span className="ml-1 text-xs text-gray-500">
                              • {c.authorRole}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                            isResolved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          }`}
                        >
                          {isResolved ? "Resolved" : "Open"}
                        </span>
                        {sharingMeta?.isOwner && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleResolved(c._id, !isResolved)
                            }
                            disabled={updatingCommentId === c._id}
                            className="text-[11px] text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {updatingCommentId === c._id
                              ? "Updating…"
                              : isResolved
                              ? "Reopen"
                              : "Mark resolved"}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {c.message}
                    </p>
                    {isResolved && (c.resolvedAt || c.resolvedByName) && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Resolved
                        {c.resolvedByName && ` by ${c.resolvedByName}`}
                        {c.resolvedAt &&
                          ` on ${new Date(c.resolvedAt).toLocaleString()}`}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
