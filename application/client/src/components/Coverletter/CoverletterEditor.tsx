import React, { useEffect, useMemo, useState , Suspense} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";
import type { Template } from "./Coverletterstore";
import type { SectionKey } from "./Coverletterstore";
import { previewRegistry } from ".";
import { pdfRegistry } from ".";
import Button from "../StyledComponents/Button";

type LocationState = { template: Template };

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
      const [text, setText] = useState(data.paragraphs.join("\n\n"));
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

  const handleSave = () => {
  try {

    console.log(localStorage.getItem("authUser"))
  }
  catch (err: any) {

  }
    const ts = new Date().toLocaleTimeString();
    setLastSaved(ts);
  }
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
    <div className="mb-4">
      <h1 className="text-2xl font-semibold mb-2">Coverletter Editor Mode</h1>

      <div className="flex items-center justify-end gap-3">
        {lastSaved && (
          <span className="text-xs text-gray-500">Saved {lastSaved}</span>
        )}
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>


        <p className="text-gray-600 mb-6">
        Loaded: <strong>{template.title}</strong> ({template.key})
        </p>


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
        
                <Suspense fallback={<button className="px-4 py-2 bg-gray-300 text-white rounded">Preparing…</button>}>
          <PDFDownloadLink
            document={pdfDoc}
            fileName="coverletter.pdf"
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            {({ loading }) => (loading ? "Preparing…" : "Save")}
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
