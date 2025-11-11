import React, { useEffect, useMemo, useState , Suspense} from "react";
import { useLocation, useNavigate,useParams  } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";
import type { Template } from "./Coverletterstore";
import type { SectionKey } from "./Coverletterstore";
import { previewRegistry } from ".";
import { pdfRegistry } from ".";
import Button from "../StyledComponents/Button";
import { saveCoverletter , updateCoverletter,createdsharedcoverletter,Getfullcoverletter} from "../../api/coverletter";
import { AIGenerateCoverletter } from "../../api/coverletter";
import { type GetCoverletterResponse, GetAiGeneratedContent} from "../../api/coverletter";

import { Share } from "lucide-react";
import type { Job } from "./hooks/useJobs";

type LocationState = { template: Template, Coverletterid? : string, coverletterData?: GetCoverletterResponse, importcoverletterData?: GetCoverletterResponse, UsersJobData?:Job, AImode?: boolean};

const API = import.meta.env.VITE_API_URL || `http://${location.hostname}:5050/`;


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
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-gray-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- editor ----
export default function CoverletterEditor() {
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const template = state?.template;
  const docid = state?.Coverletterid;
  const coverletterData = state?.coverletterData
  const importcoverletterData = state?.importcoverletterData
  const UsersJobData = state?.UsersJobData
  const AImode =  state?.AImode
  // redirect if no template
  useEffect(() => {
    if (!template) navigate("/coverletter", { replace: true });
  }, [template, navigate]);




  // initial data (from your example)
  const [data, setData] = useState<CoverLetterData>({
    name:    template!.TemplateData.name,
    phonenumber: template!.TemplateData.phonenumber,
    email: template!.TemplateData.email,
    address: template!.TemplateData.address,
    date: template!.TemplateData.date,
    recipientLines: template!.TemplateData.recipientLines,
    greeting: template!.TemplateData.greeting,
    paragraphs: template!.TemplateData.paragraphs,
    closing: template!.TemplateData.closing,
    signatureNote: template!.TemplateData.signatureNote

  });

  // which piece is being edited
  type Section = SectionKey
  const [editing, setEditing] = useState<Section | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [CoverletterID, setCoverletterID] = useState<string | null>(    () => sessionStorage.getItem("CoverletterID")  );
  const [filename, setFilename] = useState<string>("Untitled");
  

  const [error, setErr] = useState<string | null>(null);
      
  
  
  useEffect(() => {
      if (docid && coverletterData) {
        setCoverletterID(docid);
        setFilename(coverletterData.filename)
        setData(coverletterData.coverletterdata);
      }
      }, [docid,coverletterData]);
// To load when generating with ai
      useEffect(() => {
      if (AImode ==true && UsersJobData) {
            const user = JSON.parse(localStorage.getItem("authUser") ?? "")
            GetAiGeneratedContent({userid: user._id, Jobdata: UsersJobData,})
            .then((data) => {
            // setFilename(data.filename)
            // setData(data.coverletterdata)
            // sessionStorage.setItem("CoverletterID", CoverletterID);
          })
            .catch((err) => setErr(err));
      }
      }, [AImode,UsersJobData]);
// to load when importing coverleter
  useEffect(() => {
      if (importcoverletterData) {
        setFilename(importcoverletterData.filename)
        setData(importcoverletterData.coverletterdata);
      }
      }, [importcoverletterData]);
//To load saved changes in the case of refresh
useEffect(() => {
  if (!CoverletterID) return;
    const user = JSON.parse(localStorage.getItem("authUser") ?? "")
    Getfullcoverletter({userid: user._id, coverletterid: CoverletterID})
    .then((data) => {
    setFilename(data.filename)
    setData(data.coverletterdata)
    sessionStorage.setItem("CoverletterID", CoverletterID);
  })
    .catch((err) => setErr(err));
}, [CoverletterID]);


  const location = useLocation();

    useEffect(() => {
    // Adjust condition to only clear if leaving *this* page
     if (location.pathname === "/coverletter/editor") {
      // we are currently ON the editor page → don't clear yet
     
      return;
    }
    // leaving the editor → clear
    sessionStorage.removeItem("CoverletterID");
  }, [location.pathname]);

  if (!template) return null;

    const PreviewComponent = useMemo(() => {
    return previewRegistry[template.key] ?? previewRegistry["formal"];
  }, [template.key]);

    const PdfComponent = useMemo(() => {
    return pdfRegistry[template.key] ?? pdfRegistry["formal"];
  }, [template.key]);

    // pdf doc (same data)
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
            setData((d) => ({ ...d, name, phonenumber: phonenumber, email: email, address: address}));
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
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">
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
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
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
            setData((d) => ({ ...d, recipientLines: lines.split("\n").filter(Boolean) }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Recipient (one line per field)</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-40"
              value={lines}
              onChange={(e) => setLines(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
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
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
          </div>
        </form>
      );
    }

    if (editing === "paragraphs") {
      const [text, setText] = useState(
  Array.isArray(data.paragraphs)
    ? data.paragraphs.join("\n\n")
    : data.paragraphs || ""
);

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, paragraphs: text.split(/\n\s*\n/).filter(Boolean) }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Paragraphs (double-line break between paragraphs)</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-56"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
          </div>
        </form>
      );
    }

    if (editing === "closing") {
      const [closing, setClosing] = useState(data.closing);
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, closing }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Closing</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
          </div>
        </form>
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
          <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
        </div>
      </form>
    );
  };

  const handleSave = async () => {
    if (!CoverletterID){
  try {
      const user = JSON.parse(localStorage.getItem("authUser") ?? "")
  
       const ts = new Date().toLocaleTimeString();

      const Coverletter = await saveCoverletter({userid: user._id, filename: filename, templateKey: template.key, coverletterdata: data, lastSaved: ts});
      setLastSaved(ts);
      setCoverletterID(Coverletter._id)     
  }
  catch (err: any) {
      if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Something went wrong. Please try again.");
      }
  }
    }
  else {
      try {
      const user = JSON.parse(localStorage.getItem("authUser") ?? "")
       const ts = new Date().toLocaleTimeString();
      const Coverletter = await updateCoverletter({coverletterid: CoverletterID,userid: user._id, filename: filename,  coverletterdata: data, lastSaved: ts});
      setLastSaved(ts);
      setCoverletterID(Coverletter._id)     
  }
  catch (err: any) {
      if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Something went wrong. Please try again.");
      }
  }
  }
  }

const [jobTitle, setJobTitle] = useState("");
const [companyName, setCompanyName] = useState("");
const [loadingAI, setLoadingAI] = useState(false);

 const handleAIGeneration = async () => {
  if (!jobTitle || !companyName) {
    alert("Please enter both job title and company name.");
    return;
  }

  setLoadingAI(true);
  try {
    const user = JSON.parse(localStorage.getItem("authUser") ?? "{}");

    interface CompanyInfo {
      ai_summary?: string;
      headquarters?: string;
    }

    const companyInfo = (await fetch(
      `${API}/company/info?name=${encodeURIComponent(companyName)}`
    ).then((r) => r.json()).catch(() => null)) as CompanyInfo | null;

    const result = await AIGenerateCoverletter({
      job_title: jobTitle,
      company_name: companyName,
      company_summary: companyInfo?.ai_summary ?? "",
      company_address: companyInfo?.headquarters ?? "",
      user_name: user.full_name,
      user_email: user.email,
      user_phone: user.phone ?? "",
      user_address: user.address ?? "",
      user_skills: Array.isArray(user.skills)
        ? user.skills.join(", ")
        : user.skills ?? "",
      user_experience: user.years_experience ?? "",
    });

    console.log("AI Cover Letter:", result.cover_letter);

    setData((prev) => ({
      ...prev,
      paragraphs: [result.cover_letter],
    }));
  } catch (err) {
    console.error(err);
    alert("AI generation failed. Check backend logs or API key.");
  } finally {
    setLoadingAI(false);
  }
};


    const handleExport = async () => {
      const tk = template?.key ??  "formal";

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
  }
  
    const handleShare = async () => {
      try {
      const user = JSON.parse(localStorage.getItem("authUser") ?? "")
      const ts = new Date().toLocaleTimeString();
      const Sharedcoverletter = await createdsharedcoverletter({userid: user._id,coverletterid: CoverletterID ?? "", coverletterdata: data});
      navigator.clipboard.writeText(Sharedcoverletter.url)
        .then(() => {
          alert("Link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
        console.log(Sharedcoverletter)
  }
  catch (err: any) {
      if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Something went wrong. Please try again.");
      }
  }


  }
  

  // === AI assistant: company info & generator ===
const [company, setCompany] = useState("");
const [companyInfo, setCompanyInfo] = useState<any>(null);
const [aiLoading, setAiLoading] = useState(false);

async function handleAIGenerate() {
  if (!company || !jobTitle) {
    alert("Please enter both job title and company name.");
    return;
  }

  try {
    setAiLoading(true);
    // 1️⃣ Fetch researched company info
    const info = await setCompanyInfo(company);
    setCompanyInfo(info);

    // 2️⃣ Ask backend to generate a tailored paragraph
    const res = await fetch(`${import.meta.env.VITE_API_URL}/coverletter/ai-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: jobTitle,
        company_summary: companyInfo?.ai_summary ?? "",
        company_address: companyInfo?.headquarters ?? "",
      }),
    });
    const data = await res.json();

    // 3️⃣ Insert AI result into your editable paragraphs
    setData((d) => ({
      ...d,
      paragraphs: [data.cover_letter ?? "AI generation failed."],
    }));
  } catch (err) {
    console.error(err);
    alert("AI generation failed. Check backend logs or API key.");
  } finally {
    setAiLoading(false);
  }
}

  return (
<div className="max-w-7xl mx-auto px-6 py-10">
  <div className="mb-4">
    <h1 className="text-2xl font-semibold mb-2">Coverletter Editor Mode</h1>

    {/* Toolbar */}
    <div className="flex items-center gap-3 flex-wrap">
      {/* Left: Share */}
      <Button onClick={handleShare}>Share</Button>

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

      {/* Spacer pushes the rest to the right */}
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
      <Button onClick={handleExport}>Export</Button>
    </div>
  </div>

  <p className="text-gray-600 mb-6">
    Loaded: <strong>{template.title}</strong> ({template.key})
  </p>

{/* === AI Company Research & Tailored Content === */}
<div className="my-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
  <h2 className="text-lg font-semibold mb-3">AI Company Research</h2>

<div className="flex items-center gap-3 mb-6">
  <input
    type="text"
    value={jobTitle}
    onChange={(e) => setJobTitle(e.target.value)}
    placeholder="Job Title (e.g., Software Engineer)"
    className="border rounded px-3 py-2 flex-1"
  />
  <input
    type="text"
    value={companyName}
    onChange={(e) => setCompanyName(e.target.value)}
    placeholder="Company Name (e.g., Amazon)"
    className="border rounded px-3 py-2 flex-1"
  />
  <button
    onClick={handleAIGeneration}
    disabled={loadingAI}
    className={`px-4 py-2 rounded text-white ${
      loadingAI ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
    }`}
  >
    {loadingAI ? "Analyzing..." : "Generate AI Letter"}
  </button>
</div>

  {companyInfo && (
    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
      <h3 className="font-medium mb-2">
        Company Insights: {companyInfo.company}
      </h3>
      <p className="text-gray-700 whitespace-pre-line text-sm">
        {companyInfo.aiSummary}
      </p>
    </div>
  )}
</div>


{/* Coverletter on Client Side*/}
   <Suspense fallback={<div className="bg-white shadow rounded p-10 text-sm text-gray-500">Loading preview…</div>}>
        <PreviewComponent data={data} onEdit={setEditing} />
      </Suspense>


      {/* actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* preview PDF in a viewer (optional) */}
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
          <PDFDownloadLink
            document={pdfDoc}
            fileName="coverletter.pdf"
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
    </div>
  );
}
