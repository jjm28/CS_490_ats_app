import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";
import type { Template } from "./Coverletterstore";
import type { SectionKey } from "./Coverletterstore";
import { previewRegistry } from ".";
import { pdfRegistry } from ".";
import Button from "../StyledComponents/Button";
import { fetchSharedCoverletter } from "../../api/coverletter";
import type { CoverletterFeedbackComment, GetSharedCoverletterResponse, SharingMeta } from "../../api/coverletter";
import API_BASE from "../../utils/apiBase";
import { authHeaders } from "../../api/coverletter";
const API_URL = "http://localhost:5050/api/coverletter";

// ----------------------
// Types your API returns
// ----------------------

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDaysLeft(dateStr: string): string {
  const due = new Date(dateStr);
  if (isNaN(due.getTime())) return "";
  const now = new Date();
  const msDiff = due.getTime() - now.getTime();
  const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (days > 1) return `${days} days left`;
  if (days === 1) return "1 day left";
  if (days === 0) return "due today";
  if (days === -1) return "1 day past due";
  return `${Math.abs(days)} days past due`;
}


// ----------------------
export default function ShareView() {
  const [searchParams] = useSearchParams();
  const sharedid = searchParams.get("sharedid");
  const location = useLocation();
    const currentUserid =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";
    const currentUseremail =  JSON.parse(localStorage.getItem("authUser") ?? "").user.email || "dfs";

  // UI state
  const [loading, setLoading] = useState(true);
    const [hasAccess, sethasAccess] = useState(false);
const [isOwner, setisOwner] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [lastSaved, setlastSaved] = useState<string | null>(null);
  const [comments, setComments] = useState<CoverletterFeedbackComment[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(
    null
  );
    const [sharingMeta, setSharingMeta] = useState<SharingMeta | null>(null);
  
    const totalResolved = comments.filter((c) => c.resolved).length;


  // Core doc state
  const [filename, setFilename] = useState<string>("Untitled");
  const [templateKey, setTemplateKey] = useState<Template["key"]>("formal");
  const [data, setData] = useState<CoverLetterData>({
    // provide harmless defaults while loading
    name: "",
    phonenumber: "",
    email: "",
    address: "",
    date: "",
    recipientLines: [],
    greeting: "",
    paragraphs: [""],
    closing: "",
    signatureNote: "",
  });

  // Optional editor state (if you still want inline editing in ShareView)
  type Section = SectionKey;
  const [editing, setEditing] = useState<Section | null>(null);

  // ----------------------
  // Fetch from API by sharedid
  // ----------------------
  useEffect(() => {
    if (!sharedid) {
      setErr("Missing shared id.");
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        
        const res = await fetchSharedCoverletter({sharedid, currentUseremail})
  
        if (!res) {
          throw new Error(`Failed to load share`);
        }

        const payload: GetSharedCoverletterResponse = res;

        // Set state from API
        setFilename(payload.filename ?? "Untitled");
        setTemplateKey(payload.templateKey ?? "formal");
        setData(payload.coverletterdata);
        setlastSaved(payload.lastSaved)
        console.log(payload?.sharing )
       if (payload?.sharing) {
        payload.sharing.isOwner = (payload.owner == currentUserid)
        payload.sharing.allowComments =  payload.reviewers?.find(r => r.email === currentUseremail)?.canComment
         payload.sharing.canResolve =  payload.reviewers?.find(r => r.email === currentUseremail)?.canResolve
           payload.sharing.viewerRole = payload.reviewers?.find(r => r.email === currentUseremail)?.role
              const iso =  payload.reviewDeadline ?? ""
            const formattedDate = iso.split("T")[0];  // "2222-12-21"



           payload.sharing.reviewDueAt =  formattedDate
     console.log(payload.reviewers?.find(r => r.email === currentUseremail)?.canComment)
    }
        console.log(payload.sharing)
        setSharingMeta(
          (payload?.sharing || {
            visibility: "unlisted",
            allowComments: true,
          }) as SharingMeta
        );
        setComments((payload?.comments || []) as CoverletterFeedbackComment[]);

        setisOwner(payload.owner == currentUserid)
          const emails =  payload.reviewers?.map(r => r.email) ??
  payload.restricteduserid ??
  []
        sethasAccess((emails.includes(currentUseremail) || payload.owner == currentUserid) ?? false)
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load shared document.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [sharedid]);

  



  // Pick components from registries by templateKey
  const PreviewComponent = useMemo(
    () => previewRegistry[templateKey] ?? previewRegistry["formal"],
    [templateKey]
  );
  const PdfComponent = useMemo(
    () => pdfRegistry[templateKey] ?? pdfRegistry["formal"],
    [templateKey]
  );

  const pdfDoc = useMemo(() => <PdfComponent {...data} />, [PdfComponent, data]);




  // Export/import as before (left intact)
  const handleExport = async () => {
      const tk = templateKey ??  "formal";

        const jsondata =  { userid:"", filename: filename,templateKey: tk,coverletterdata: {...data},lastSaved: lastSaved }


        const jsonStr = JSON.stringify(jsondata, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
  };

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
        `${API_URL}/shared/${encodeURIComponent(sharedid)}/comments?userId=${currentUserid}`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify({ message: newComment.trim(), currentUseremail: currentUseremail }),
        }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to submit feedback.");
      }
      const payload = await res.json();
      // backend can return updated comments list or just new comment
      if (Array.isArray(payload?.comments)) {
        setComments(payload.comments as CoverletterFeedbackComment[]);
      } else if (payload?.comment) {
        setComments((prev) => [...prev, payload.comment as CoverletterFeedbackComment]);
      }
      setNewComment("");
    } catch (error :any) {
            setFeedbackError(error?.message ?? "Failed to submit feedback.");

    }finally {
      setSubmittingComment(false);
    }
    };



      const handleToggleResolved = async (commentId: string, resolved: boolean) => {
   if (!sharedid) return;
    if (!sharingMeta?.canResolve) {
      setFeedbackError("You have not been given permission to resolve feedback.");
      return;
    }
    try {
      setUpdatingCommentId(commentId);
      const res = await fetch(
        `${API_URL}/shared/${encodeURIComponent(
          sharedid
        )}/comments/${encodeURIComponent(commentId)}?userId=${currentUserid}`,
        {
          method: "PATCH",
          credentials: "include",
          headers:authHeaders(),
          body: JSON.stringify({ resolved }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update comment.");
      }
      const payload = await res.json();
      if (Array.isArray(payload?.comments)) {
        setComments(payload.comments as CoverletterFeedbackComment[]);
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
  


  // ----------------------
  // Render
  // ----------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-600">Loading shared cover letter…</p>
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

  

  return (
    <div>
                {hasAccess ?  <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">

        <h1 className="text-2xl font-semibold mb-2">Coverletter (Shared View)</h1> 
        {(sharingMeta?.viewerRole || sharingMeta?.reviewDueAt) && (
      <div className="mb-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-800">
          {sharingMeta?.viewerRole && (
            <span>
              Role:{" "}
              <span className="font-medium">
                {sharingMeta.viewerRole}
              </span>
            </span>
          )}
          {sharingMeta?.viewerRole && sharingMeta?.reviewDueAt && (
            <span className="text-blue-300">•</span>
          )}
          {sharingMeta?.reviewDueAt && (
            <span>
              Review due:{" "}
              <span className="font-medium">
                {formatShortDate(sharingMeta.reviewDueAt)} (
                {formatDaysLeft(sharingMeta.reviewDueAt)})
              </span>
            </span>
          )}
        </span>
      </div>
    )}   
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="filename" className="text-sm font-medium text-gray-700 whitespace-nowrap">
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
          <Button onClick={handleExport}>Export JSON</Button>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Loaded template: <strong>{templateKey}</strong>
      </p>

      <Suspense fallback={<div className="bg-white shadow rounded p-10 text-sm text-gray-500">Loading preview…</div>}>
        <PreviewComponent data={data} onEdit={setEditing} />
      </Suspense>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <details className="w-full">
          <summary className="cursor-pointer text-sm text-gray-600">Preview PDF (optional)</summary>
          <div className="mt-3 border rounded overflow-hidden">
            <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading PDF…</div>}>
              <PDFViewer width="100%" height={700} showToolbar>
                {pdfDoc}
              </PDFViewer>
            </Suspense>
          </div>
        </details>

        <Suspense fallback={<button className="px-4 py-2 bg-gray-300 text-white rounded">Preparing…</button>}>
          <PDFDownloadLink document={pdfDoc} fileName={`${filename || "coverletter"}.pdf`} className="inline-block px-4 py-2 bg-black text-white rounded">
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
                        {sharingMeta?.isOwner || sharingMeta?.canResolve && (
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
      {/* Modal for edits (optional) */}
      {/* <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing}` : "Edit"}>
        <EditorForm />
      </Modal> */}

      
    </div> : <div><h1>You don't have access</h1></div>}

</div>
   
  );
}
