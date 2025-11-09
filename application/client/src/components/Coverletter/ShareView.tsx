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
import type { GetSharedCoverletterResponse } from "../../api/coverletter";
// ----------------------
// Types your API returns
// ----------------------


// ----------------------
export default function ShareView() {
  const [searchParams] = useSearchParams();
  const sharedid = searchParams.get("sharedid");
  const location = useLocation();

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

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
        
        const res = await fetchSharedCoverletter({sharedid})
  
        if (!res) {
          throw new Error(`Failed to load share`);
        }

        const payload: GetSharedCoverletterResponse = res;

        // Set state from API
        setFilename(payload.filename ?? "Untitled");
        setTemplateKey(payload.templateKey ?? "formal");
        setData(payload.coverletterdata);
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
  const handleImport = async () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "coverletter.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
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
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Coverletter (Shared View)</h1>

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
          <Button onClick={handleImport}>Export JSON</Button>
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

      {/* Modal for edits (optional) */}
      {/* <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing}` : "Edit"}>
        <EditorForm />
      </Modal> */}
    </div>
  );
}
