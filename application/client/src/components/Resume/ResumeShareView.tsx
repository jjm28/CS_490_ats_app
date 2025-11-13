import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import Button from "../StyledComponents/Button";
import { resumePreviewRegistry, resumePdfRegistry } from "../../components/Resume";
import type { ResumeData, TemplateKey } from "../../api/resumes";

const API =
  (import.meta as any).env?.VITE_API_URL ||
  `${(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5050"}/api`;

function getAuthHeaders() {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  const token = (u?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

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
    projects: []
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!sharedid) { setErr("Missing shared id."); setLoading(false); return; }
        setLoading(true);
        const res = await fetch(`${API}/resumes/shared/${encodeURIComponent(sharedid)}`, {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders()
        });
        if (res.status === 404) { setErr("Shared resume not found."); setLoading(false); return; }
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.error || res.statusText); }
        const payload = await res.json();
        setFilename(payload?.filename ?? "Untitled");
        setTemplateKey((payload?.templateKey as TemplateKey) ?? "chronological");
        setData((payload?.resumedata ?? {}) as ResumeData);
        setLastSaved(payload?.lastSaved ?? null);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load shared resume.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sharedid]);

  const PreviewComponent = useMemo(
    () => resumePreviewRegistry[templateKey] ?? resumePreviewRegistry.chronological,
    [templateKey]
  );
  const PdfComponent = useMemo(
    () => resumePdfRegistry[templateKey] ?? resumePdfRegistry.chronological,
    [templateKey]
  );

  // FIX: spread props instead of {data}
  const pdfDoc = useMemo(() => <PdfComponent {...data} />, [PdfComponent, data]);

  const handleExport = async () => {
    const payload = { filename, templateKey, resumedata: { ...data }, lastSaved };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename || "resume"}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Resume (Shared View)</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="filename" className="text-sm font-medium text-gray-700 whitespace-nowrap">File name:</label>
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
        <PreviewComponent data={data} onEdit={() => {}} />
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
          <PDFDownloadLink
            document={pdfDoc}
            fileName={`${filename || "resume"}.pdf`}
            className="inline-block px-4 py-2 bg-black text-white rounded"
          >
            {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
          </PDFDownloadLink>
        </Suspense>
      </div>
    </div>
  );
}
