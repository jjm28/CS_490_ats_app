import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";
import type { Template } from "./Coverletterstore";
import type { SectionKey } from "./Coverletterstore";
import { previewRegistry } from ".";
import { pdfRegistry } from ".";
import Button from "../StyledComponents/Button";
import RichTextEditor from "./RichTextEditor";
import { exportTXT, exportDOCX, openPrintWindow } from "./exportUtils";
import {
  saveCoverletter,
  updateCoverletter,
  createdsharedcoverletter,
  Getfullcoverletter,
  authHeaders,getCoverletterFeedbackSummary,updateCoverletterWorkflow
} from "../../api/coverletter";
import type { GetCoverletterResponse,FeedbackSummaryResponse,WorkflowStatus } from "../../api/coverletter";
import type { Job } from "./hooks/useJobs";
import type { AIcoverletterPromptResponse } from "../../api/coverletter";
const API_URL = "http://localhost:5050/api/coverletter";
import MiniReviewProgress from "./MiniReviewProgress";
import {
  startProductivitySession,
  endProductivitySession,
} from "../../api/productivity";
import { set } from "date-fns";
import type { ReviewerStatus } from "../../api/coverletter";
type LocationState = {
  template: Template;
  Coverletterid?: string;
  coverletterData?: GetCoverletterResponse;
  importcoverletterData?: GetCoverletterResponse;
  UsersJobData?: Job;
  AImode?: boolean;
  GeminiCoverletter?: AIcoverletterPromptResponse;
};


type ReviewerMeta = {
  email: string;
  role?: "mentor" | "peer" | "advisor" | "recruiter" | "other";
  status?: ReviewerStatus;
  lastActivityAt?: string;
  completedAt?: string;
};
//const API = import.meta.env.VITE_API_URL || `http://${location.hostname}:5050/`;



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

type RelevantExperience = {
  title: string;
  company: string;
  relevanceScore: number;
  reason: string;
};

// ---- editor ----
export default function CoverletterEditor() {
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;

  const template = state?.template;
  const docid = state?.Coverletterid;
  const coverletterData = state?.coverletterData;
  const importcoverletterData = state?.importcoverletterData;
  const AImode = state?.AImode;

  const GeminiCoverletterData: AIcoverletterPromptResponse | undefined =
    state?.GeminiCoverletter;

  const [variations, setVariations] = useState<CoverLetterData[] | null>(null);
  const [selectedVarIdx, setSelectedVarIdx] = useState<number>(0);
  const [choiceLocked, setChoiceLocked] = useState<boolean>(false);

  const relevantExperiences: RelevantExperience[] =
    GeminiCoverletterData?.parsedCandidates?.[selectedVarIdx]
      ?.relevantExperiences ?? [];

  const [exportOpen, setExportOpen] = useState(false);
 const [reviewers, setReviewers] = useState<ReviewerMeta[]>([]);
  // redirect if no template
  useEffect(() => {
    if (!template) navigate("/coverletter", { replace: true });
  }, [template, navigate]);

  // base data
  const [data, setData] = useState<CoverLetterData>(() => ({
    name: template!.TemplateData.name,
    phonenumber: template!.TemplateData.phonenumber,
    email: template!.TemplateData.email,
    address: template!.TemplateData.address,
    date: template!.TemplateData.date,
    recipientLines: template!.TemplateData.recipientLines,
    greeting: template!.TemplateData.greeting,
    paragraphs: template!.TemplateData.paragraphs,
    closing: template!.TemplateData.closing,
    signatureNote: template!.TemplateData.signatureNote,
  }));

  // which piece is being edited
  type Section = SectionKey;
  const [editing, setEditing] = useState<Section | null>(null);

  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [CoverletterID, setCoverletterID] = useState<string | null>(() =>
    sessionStorage.getItem("CoverletterID")
  );
    const currentUserid =  JSON.parse(localStorage.getItem("authUser") ?? "").user._id || "dfs";

  const [filename, setFilename] = useState<string>(() => {
  return generateSmartFilename(state?.UsersJobData);
  });

  const [error, setErr] = useState<string | null>(null);
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

const [inviteRole, setInviteRole] = useState<"mentor" | "peer" | "advisor" | "recruiter" | "other">("mentor");
const [inviteCanComment, setInviteCanComment] = useState<boolean>(true);
const [inviteCanResolve, setInviteCanResolve] = useState<boolean>(false);
  const [feedbackSummaryOpen, setFeedbackSummaryOpen] = useState(false);
  const [feedbackSummaryLoading, setFeedbackSummaryLoading] = useState(false);
  const [feedbackSummaryError, setFeedbackSummaryError] = useState<string | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummaryResponse | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("draft");
  const [approvedByName, setApprovedByName] = useState<string | undefined>();
  const [approvedAt, setApprovedAt] = useState<string | undefined>();
  const [updatingWorkflow, setUpdatingWorkflow] = useState(false);


    const handleOpenFeedbackSummary = async () => {
    if (!CoverletterID) return;

    setFeedbackSummaryOpen(true);
    setFeedbackSummaryLoading(true);
    setFeedbackSummaryError(null);

    try {
      const summary = await getCoverletterFeedbackSummary({
        userid: currentUserid,
        coverletterid: CoverletterID,
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
  const handleChangeWorkflowStatus = async (next: WorkflowStatus) => {
    if (!CoverletterID || next === workflowStatus) return;

    try {
      setUpdatingWorkflow(true);
      const res = await updateCoverletterWorkflow({
        coverletterid: CoverletterID,
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

const handleRemoveInvite = async (emailToRemove: string) => {
  setInvitedEmails((prev) => prev.filter((e) => e !== emailToRemove));
    setReviewers((prev) => prev.filter((r) => r.email !== emailToRemove));

          let inviteremoveData = {
        coverletterid: CoverletterID, email :emailToRemove
        }
        const res = await fetch(
        `${API_URL}/removeinvite?userId=${currentUserid}`,
        {
          method: "DELETE",
             headers: authHeaders(),
          credentials: "include",
          body: JSON.stringify(inviteremoveData),
        }
      );
    if(res) alert("Removed Acces")
};


  // load from explicit cover letter id/data
  useEffect(() => {
    if (docid && coverletterData) {
      setCoverletterID(docid);
      setFilename(coverletterData.filename);
      setData(coverletterData.coverletterdata);
      setVariations(null);
      setChoiceLocked(true);
    }
  }, [docid, coverletterData]);

  // load when generating with AI — show variations picker
  useEffect(() => {
    if (AImode === true && GeminiCoverletterData?.parsedCandidates?.length) {
      const arr = GeminiCoverletterData.parsedCandidates;
      setVariations(arr);
      setSelectedVarIdx(0);
      setData(arr[0]);
      setChoiceLocked(false);
      // Auto-update filename based on job + chosen variation
  if (state?.UsersJobData) {
  setFilename(generateSmartFilename(state.UsersJobData));
  }
    }
  }, [AImode, GeminiCoverletterData]);

  // to load when importing cover letter (single)
  useEffect(() => {
    if (importcoverletterData) {
      setFilename(importcoverletterData.filename);
      setData(importcoverletterData.coverletterdata);
      setVariations(null);
      setChoiceLocked(true);
    }
  }, [importcoverletterData]);

  // To load saved changes in the case of refresh
  useEffect(() => {
    if (!CoverletterID) return;

    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) throw new Error("Not signed in (authUser missing).");
      const user = JSON.parse(raw).user;

      Getfullcoverletter({
        userid: user._id,
        coverletterid: CoverletterID,
      })
        .then((resp) => {

        const status = resp.workflowStatus || "draft";
        setWorkflowStatus(status);
        setApprovedByName(resp.approvedByName);
        setApprovedAt(resp.approvedAt || undefined);
          setFilename(resp.filename);
          setData(resp.coverletterdata);
          sessionStorage.setItem("CoverletterID", CoverletterID);
          setShareAllowComments(resp.allowComments ?? true)
          setShareVisibility(resp.visibility ?? 'restricted')
          const iso =resp.reviewDeadline ?? ""
const formattedDate = iso.split("T")[0];  // "2222-12-21"


          setShareDeadline(formattedDate )
setInvitedEmails(
  resp.reviewers?.map(r => r.email) ??
  resp.restricteduserid ??
  []
);     
setReviewers(
  resp.reviewers?.map(r => ({
    email: r.email,
    role: r.role as ReviewerMeta["role"],
    status: r.status,
    lastActivityAt: r.lastActivityAt
      ? new Date(r.lastActivityAt).toISOString()
      : undefined,
    completedAt: r.completedAt
      ? new Date(r.completedAt).toISOString()
      : undefined,
  })) ?? []
);

setVariations(null);
          setChoiceLocked(true);
        })
        .catch((err) => setErr(err?.message ?? String(err)));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }, [CoverletterID]);

  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/coverletter/editor") return;
    sessionStorage.removeItem("CoverletterID");
  }, [location.pathname]);

  //Tracking for Productivity
  useEffect(() => {
    let canceled = false;
    let sessionId: string | null = null;

    (async () => {
      try {
        const session = await startProductivitySession({
          activityType: "coverletter_edit",
          jobId: state?.UsersJobData?._id ?? undefined,
          context: "CoverletterEditor",
        });
        if (!canceled) {
          sessionId = session._id;
        }
      } catch (err) {
        console.error(
          "[productivity] Failed to start coverletter_edit session:",
          err
        );
      }
    })();

    return () => {
      canceled = true;
      if (sessionId) {
        endProductivitySession({ sessionId }).catch((err) =>
          console.error(
            "[productivity] Failed to end coverletter_edit session:",
            err
          )
        );
      }
    };
  }, [state?.UsersJobData?._id]);

  if (!template) return null;

  const PreviewComponent = useMemo(() => {
    return previewRegistry[template.key] ?? previewRegistry["formal"];
  }, [template.key]);

  const PdfComponent = useMemo(() => {
    return pdfRegistry[template.key] ?? pdfRegistry["formal"];
  }, [template.key]);

  const pdfDoc = useMemo(() => <PdfComponent {...data} />, [PdfComponent, data]);

  // ---- small editors for each section ----
  const EditorForm = () => {
    if (!editing) return null;

    if (editing === "header") {
      const [name, setName] = useState(data.name);
      const [phonenumber, setphonenumber] = useState(data.phonenumber);
      const [email, setemail] = useState(data.email);
      const [address, setaddress] = useState(data.address);

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({
              ...d,
              name,
              phonenumber: phonenumber,
              email: email,
              address: address,
            }));
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

          <label className="block">
            <span className="text-sm font-medium">Phone Number</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={phonenumber}
              onChange={(e) => setphonenumber(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setemail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Address</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={address}
              onChange={(e) => setaddress(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-100"
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

    if (editing === "date") {
      const [date, setDate] = useState(data.date);

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, date }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Date</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-100"
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

    if (editing === "recipient") {
      const [lines, setLines] = useState(data.recipientLines.join("\n"));

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({
              ...d,
              recipientLines: lines.split("\n").filter(Boolean),
            }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">
              Recipient (one line per field)
            </span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-40"
              value={lines}
              onChange={(e) => setLines(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-100"
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

    if (editing === "greeting") {
      const [greeting, setGreeting] = useState(data.greeting);

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, greeting }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Greeting</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-100"
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

    if (editing === "paragraphs") {
      return (
        <div className="space-y-3">
          <RichTextEditor
            value={data.paragraphs}
            onChange={(cleanParas) =>
              setData((d) => ({ ...d, paragraphs: cleanParas }))
            }
          />
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-100"
            >
              Done
            </button>
          </div>
        </div>
      );
    }

    // signature
    const [sig, setSig] = useState(data.signatureNote);

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setData((d) => ({ ...d, signatureNote: sig }));
          setEditing(null);
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className="text-sm font-medium">Signature note</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={sig}
            onChange={(e) => setSig(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-4 py-2 rounded bg-gray-100"
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
  };

    // Export/import as before (left intact)
  const handleExport = async () => {
      const tk = template["key"] ??  "formal";

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
  
  const handleSave = async () => {
    if (!CoverletterID) {
      try {
        const raw = localStorage.getItem("authUser");
        if (!raw) throw new Error("Not signed in (authUser missing).");
        const user = JSON.parse(raw).user;

        const ts = new Date().toLocaleTimeString();

        const Coverletter = await saveCoverletter({
          userid: user._id,
          filename: filename,
          templateKey: template.key,
          coverletterdata: data,
          lastSaved: ts,
        });

        setLastSaved(ts);
        setCoverletterID(Coverletter._id);

        setChoiceLocked(true);
        setVariations(null);
      } catch (err: any) {
        setErr(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    } else {
      try {
        const raw = localStorage.getItem("authUser");
        if (!raw) throw new Error("Not signed in (authUser missing).");
        const user = JSON.parse(raw).user;

        const ts = new Date().toLocaleTimeString();

        const Coverletter = await updateCoverletter({
          coverletterid: CoverletterID,
          userid: user._id,
          filename: filename,
          coverletterdata: data,
          lastSaved: ts,
        });

        setLastSaved(ts);
        setCoverletterID(Coverletter._id);
        setChoiceLocked(true);
        setVariations(null);
      } catch (err: any) {
        setErr(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    }
  };

  const handleShareConfirm = async () => {
    try {
            setShareLoading(true);
      const raw = localStorage.getItem("authUser");
      if (!raw) throw new Error("Not signed in (authUser missing).");
      const user = JSON.parse(raw).user;

      const Sharedcoverletter = await createdsharedcoverletter({
        userid: user._id,
        coverletterid: CoverletterID ?? "",
        coverletterdata: data,
        visibility: shareVisibility,
          allowComments: shareAllowComments,
           reviewDeadline: shareDeadline
      });
        setShareUrl(Sharedcoverletter.url || null);

      navigator.clipboard
        .writeText(Sharedcoverletter.url)
        .then(() => {
          alert("Link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
        setShowShareSettings(false);

        
    } catch (err: any) {
      setErr(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  };

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
      const Sharedcoverletter = await createdsharedcoverletter({
        userid: currentUserid,
        coverletterid: CoverletterID ?? "",
        coverletterdata: data,
        visibility: shareVisibility,
          allowComments: shareAllowComments,
          reviewDeadline: shareDeadline
      });
        setShareUrl(Sharedcoverletter.url || null);

        let inviteData = {
        toemail :inviteEmail, sharedurl: Sharedcoverletter.url, coverletterid: CoverletterID, role: inviteRole, canComment: inviteCanComment, canResolve: inviteCanResolve, reviewDeadline: shareDeadline
        }

      const res = await fetch(
        `${API_URL}/invite?userId=${currentUserid}`,
        {
          method: "POST",
             headers: authHeaders(),
          credentials: "include",
          body: JSON.stringify(inviteData),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to invite supporter");
      }


    } catch (err: any) {
      console.error(err);
      setErr(err.message || "Error inviting supporter");
    }


};

 
function generatePdfFilename(filename: string) {
  return filename.endsWith(".pdf") ? filename : filename + ".pdf";
}

  function generateSmartFilename(job?: Job, fallbackName?: string) {
  if (!job) {
    return (fallbackName || "CoverLetter").replace(/[^\w\d-_]+/g, "_") + ".pdf";
  }

  const company = job.company || "Company";
  const title = job.jobTitle || "Position";

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const cleanedCompany = company.replace(/[^\w\d-_]+/g, "_");
  const cleanedTitle = title.replace(/[^\w\d-_]+/g, "_");

  return `${cleanedCompany}_${cleanedTitle}_CoverLetter_${date}.pdf`;
}
  class PDFErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(err: any) {
      console.error("PDF render error:", err);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="p-4 bg-red-50 text-red-600 border rounded">
            PDF Preview failed to render.
          </div>
        );
      }
      return this.props.children;
    }
  }

  const showVariationsPicker = Boolean(variations?.length && !choiceLocked);
  function stripExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "");  // removes .pdf/.docx/etc.
}

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Coverletter Editor Mode</h1>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Left: Share */}
        <div className="flex items-center gap-2">
      <Button
        onClick={() => setShowShareSettings(true)}
        disabled={!CoverletterID}
      >
        Share
      </Button>

      <MiniReviewProgress
        reviewers={reviewers}
        reviewDeadline={shareDeadline || undefined}
      />
      
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">Status:</span>
      <button
        type="button"
        disabled={updatingWorkflow || !CoverletterID}
        className={`
          inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border
          ${workflowStatus === "approved"
            ? "bg-green-50 border-green-200 text-green-700"
            : workflowStatus === "in_review"
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : workflowStatus === "changes_requested"
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-gray-50 border-gray-200 text-gray-700"}
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

    {/* Simple inline status controls under toolbar */}
<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
  <span>Quick status:</span>
  <button
    type="button"
    className={`px-2 py-1 rounded border ${
      workflowStatus === "draft" ? "border-gray-400" : "border-gray-200"
    }`}
    onClick={() => handleChangeWorkflowStatus("draft")}
    disabled={updatingWorkflow || !CoverletterID}
  >
    Draft
  </button>
  <button
    type="button"
    className={`px-2 py-1 rounded border ${
      workflowStatus === "in_review" ? "border-blue-400" : "border-gray-200"
    }`}
    onClick={() => handleChangeWorkflowStatus("in_review")}
    disabled={updatingWorkflow || !CoverletterID}
  >
    In review
  </button>
  <button
    type="button"
    className={`px-2 py-1 rounded border ${
      workflowStatus === "changes_requested" ? "border-amber-400" : "border-gray-200"
    }`}
    onClick={() => handleChangeWorkflowStatus("changes_requested")}
    disabled={updatingWorkflow || !CoverletterID}
  >
    Changes requested
  </button>
  <button
    type="button"
    className={`px-2 py-1 rounded border ${
      workflowStatus === "approved" ? "border-green-500" : "border-gray-200"
    }`}
    onClick={() => handleChangeWorkflowStatus("approved")}
    disabled={updatingWorkflow || !CoverletterID}
  >
    Approved
  </button>

  {workflowStatus === "approved" && approvedByName && (
    <span className="ml-2 text-[10px] text-green-700">
      Approved by {approvedByName}
      {approvedAt && ` on ${new Date(approvedAt).toLocaleDateString()}`}
    </span>
  )}
</div>

        <Button
      type="button"
      variant="secondary"
      onClick={handleOpenFeedbackSummary}
      disabled={!CoverletterID}
    >
      Feedback summary
    </Button>
    </div>
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
              Review deadline <span className="text-xs text-gray-400">(optional)</span>
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
              Last share link: <span className="font-mono">{shareUrl}</span>
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
                    setInviteRole(e.target.value as
                      | "mentor"
                      | "peer"
                      | "advisor"
                      | "recruiter"
                      | "other")
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
                <span className="text-gray-600">Can resolve comments</span>
              </label>
            </div>

            {inviteError && (
              <p className="mt-1 text-xs text-red-500">{inviteError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              We’ll email them a link to view this cover letter with the role and permissions you selected.
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

          {/* Middle: filename */}
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
            placeholder="e.g., Acme Sales – Dec 2025"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: status + actions */}
          {error ? (
            <span className="text-xs text-red-500">Error: {error}</span>
          ) : (
            lastSaved && (
              <span className="text-xs text-gray-500">Saved {lastSaved}</span>
            )
          )}

          <Button onClick={handleSave}>Save</Button>

{/* Export Dropdown */}
<div className="relative inline-block">
  <button
    className="px-4 py-2 bg-black text-white rounded"
    onClick={() => setExportOpen((v) => !v)}
  >
    Export ▾
  </button>

  {exportOpen && (
    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border rounded z-50">

      {/* ---- PDF DOWNLOAD ---- */}
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          setExportOpen(false);

          // Always match the actual PDF anchor
          const downloadName = generatePdfFilename(filename);

          const pdfAnchor = document.querySelector(
            `a[download='${downloadName}']`
          ) as HTMLAnchorElement | null;

          pdfAnchor?.click();
        }}
      >
        Download PDF
      </button>
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          setExportOpen(false);
          handleExport();
        }}
      >
        Download JSON
      </button>
      {/* ---- DOCX DOWNLOAD ---- */}
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          setExportOpen(false);
          // Strip extension so DOCX becomes .docx not .pdf.docx
          exportDOCX(data, stripExtension(filename));
        }}
      >
        Download DOCX
      </button>

      {/* ---- TXT DOWNLOAD ---- */}
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          setExportOpen(false);
          // Strip extension so TXT becomes .txt not .pdf.txt
          exportTXT(data, stripExtension(filename));
        }}
      >
        Download TXT
      </button>

      {/* ---- PRINT ---- */}
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          setExportOpen(false);
          openPrintWindow(data);
        }}
      >
        Print Version
      </button>
    </div>
  )}
</div>

        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Loaded: <strong>{template.title}</strong> ({template.key})
      </p>

      {/* === Variations Picker === */}
      {showVariationsPicker && (
        <div className="mb-8 border border-emerald-200 rounded-lg p-5 bg-emerald-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              AI generated {variations!.length} variations
            </h2>
            <span className="text-xs text-gray-600">
              Select a version. <strong>Saving</strong> will lock this choice.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {variations!.map((v, idx) => {
              const firstPara = Array.isArray(v.paragraphs)
                ? v.paragraphs[0]
                : v.paragraphs;
              const isSelected = idx === selectedVarIdx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedVarIdx(idx);
                    setData(v);
                  }}
                  className={`text-left rounded-lg border p-4 hover:bg-white transition ${
                    isSelected
                      ? "border-emerald-600 bg-white shadow"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Version {idx + 1}</div>
                    <div
                      className={`text-xs px-2 py-0.5 rounded ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 line-clamp-6 whitespace-pre-line">
                    <div className="font-semibold mb-1">{v.greeting}</div>
                    {firstPara || "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Experience Relevance */}
      {relevantExperiences.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            Experience Relevance Score
          </h3>

          {relevantExperiences.map((exp, idx) => (
            <div key={idx} className="mb-2">
              <div className="text-sm font-medium">
                {exp.title} @ {exp.company}
              </div>
              <div className="text-xs text-gray-600">
                Score:{" "}
                <span className="font-bold text-blue-700">
                  {exp.relevanceScore}
                </span>
                /100
              </div>
              <div className="text-xs text-gray-600 italic">{exp.reason}</div>
            </div>
          ))}
        </div>
      )}

      {/* Coverletter preview */}
      <Suspense
        fallback={
          <div className="bg-white shadow rounded p-10 text-sm text-gray-500">
            Loading preview…
          </div>
        }
      >
        <PreviewComponent data={data} onEdit={setEditing} />
      </Suspense>

      {/* actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* preview PDF */}
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
              <PDFErrorBoundary>
                <PDFViewer width="100%" height={700} showToolbar>
                  {pdfDoc}
                </PDFViewer>
              </PDFErrorBoundary>
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
            fileName={generatePdfFilename(filename)}
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
          </PDFDownloadLink>
        </Suspense>
      </div>

      {/* modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Edit ${editing[0].toUpperCase() + editing.slice(1)}`
            : "Edit"
        }
      >
        <EditorForm />
      </Modal>


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

        {feedbackSummary && !feedbackSummaryLoading && !feedbackSummaryError && (
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

                {feedbackSummary.aiSummary.improvementSuggestions?.length > 0 && (
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

    </div>
  );
}
