import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import Button from "../StyledComponents/Button";
import { resumePreviewRegistry, resumePdfRegistry } from "../../components/Resume";
import type { ResumeData, ResumeStyle } from "./index";
import { createResumeTemplate } from "../../api/templates";
import { getFullResume, saveResume, updateResume, createSharedResume } from "../../api/resumes";

type SectionKey = "header" | "summary" | "experience" | "education" | "skills" | "projects";
type Template = { key: "chronological" | "functional" | "hybrid"; title: string };
type LocationState = {
  template: Template;
  ResumeId?: string;
  resumeData?: { filename: string; templateKey: Template["key"]; resumedata: ResumeData; lastSaved?: string };
};

export default function ResumeEditor() {
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const template = state?.template;
  const docid = state?.ResumeId;
  const prefetched = state?.resumeData;

  useEffect(() => { if (!template) navigate("/resumes", { replace: true }); }, [template, navigate]);
  if (!template) return null;

  const [data, setData] = useState<ResumeData>(
    prefetched?.resumedata ?? {
      name: "", title: "", email: "", phone: "", location: "",
      summary: "", experience: [], education: [], skills: [], projects: [],
      style: { color: { primary: "#111827" }, font: { family: "Inter", sizeScale: "M" }, layout: { columns: 1 } }
    }
  );
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(docid ?? null);
  const [filename, setFilename] = useState<string>(prefetched?.filename ?? "Untitled");
  const [lastSaved, setLastSaved] = useState<string | null>(prefetched?.lastSaved ?? null);
  const [error, setErr] = useState<string | null>(null);

  const PreviewComponent = useMemo(() => resumePreviewRegistry[template.key] ?? resumePreviewRegistry.chronological, [template.key]);
  const PdfComponent = useMemo(() => resumePdfRegistry[template.key] ?? resumePdfRegistry.chronological, [template.key]);
  const pdfDoc = useMemo(() => <PdfComponent {...data} />, [PdfComponent, data]);

  const handleSave = async () => {
    try {
      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw) : null;
      if (!user?._id) throw new Error("Missing user session");
      const ts = new Date().toLocaleTimeString();
      if (!resumeId) {
        const created = await saveResume({ userid: user._id, filename, templateKey: template.key, resumedata: data, lastSaved: ts });
        setResumeId(created._id);
        setLastSaved(ts);
        alert("Save (stub). Wire to saveResume()");
      } else {
        await updateResume({ resumeid: resumeId, userid: user._id, filename, resumedata: data, lastSaved: ts, templateKey: template.key });
        setLastSaved(ts);
        alert("Update (stub). Wire to updateResume()");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Save failed.");
    }
  };

  const handleExport = async () => {
    const payload = { userid: "", filename, templateKey: template.key, resumedata: { ...data }, lastSaved };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${filename || "resume"}.json`; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    try {
      const shared = await createSharedResume({ userid: "…", resumeid: resumeId ?? "" });
      await navigator.clipboard.writeText(shared.url);
      alert("Link copied to clipboard!");
    } catch (e: any) { setErr(e?.message ?? "Share failed."); }
  };

  const handleSwitchTemplate = async (nextKey: "chronological"|"functional"|"hybrid") => {
    try {
      setErr(null);
      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw) : null;
      await updateResume({ resumeid: resumeId!, userid: user._id, templateKey: nextKey });
      navigate("/resumes/editor", {
        state: {
          template: { key: nextKey, title: nextKey[0].toUpperCase() + nextKey.slice(1) },
          ResumeId: resumeId,
          resumeData: { ...prefetched, filename, resumedata: data, lastSaved }
        }
      });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to switch template.");
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw) : null;
      if (!user?._id) throw new Error("Missing user session");
      // optional auth: const token = user?.token;
      await createResumeTemplate({ userid: user._id, title: filename, templateKey: template.key, style: data.style });
      alert("Saved as template (stub).");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save template.");
    }
  };

  const handleImportTemplate = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const tpl = JSON.parse(text);
    setData(d => ({ ...d, style: { ...(d.style || {}), ...(tpl.style || {}) } }));
  };

  /** ---------------- Template Settings ---------------- */
  function TemplateSettings() {
    const s: ResumeStyle = data.style ?? {};
    const color = s.color ?? {};
    const font = s.font ?? {};
    const layout = s.layout ?? {};

    return (
      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h3 className="font-semibold mb-3">Template Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Primary color</span>
            <input
              type="color"
              value={color.primary ?? "#111827"}
              onChange={(e) => setData(d => ({
                ...d, style: { ...d.style, color: { ...(d.style?.color || {}), primary: e.target.value } }
              }))}
            />
          </label>

          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Font</span>
            <select
              className="w-full rounded border px-2 py-1"
              value={font.family ?? "Inter"}
              onChange={(e) => setData(d => ({
                ...d, style: { ...d.style, font: { ...(d.style?.font || {}), family: e.target.value as any } }
              }))}
            >
              <option value="Inter">Inter</option>
              <option value="Serif">Serif</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Size</span>
            <select
              className="w-full rounded border px-2 py-1"
              value={font.sizeScale ?? "M"}
              onChange={(e) => setData(d => ({
                ...d, style: { ...d.style, font: { ...(d.style?.font || {}), sizeScale: e.target.value as any } }
              }))}
            >
              <option value="S">Small</option>
              <option value="M">Medium</option>
              <option value="L">Large</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Columns</span>
            <select
              className="w-full rounded border px-2 py-1"
              value={layout.columns ?? 1}
              onChange={(e) => setData(d => ({
                ...d, style: { ...d.style, layout: { ...(d.style?.layout || {}), columns: Number(e.target.value) as 1|2 } }
              }))}
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  /** --------------- Minimal section editor modal (same as before) --------------- */
  const EditorForm = () => {
    if (!editing) return null;
    if (editing === "header") {
      const [name, setName] = useState(data.name);
      const [title, setTitle] = useState(data.title ?? "");
      const [email, setEmail] = useState(data.email ?? "");
      const [phone, setPhone] = useState(data.phone ?? "");
      const [location, setLocation] = useState(data.location ?? "");
      return (
        <form onSubmit={(e) => { e.preventDefault(); setData((d) => ({ ...d, name, title, email, phone, location })); setEditing(null); }} className="space-y-3">
          <label className="block"><span className="text-sm font-medium">Name</span><input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium">Title</span><input className="mt-1 w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium">Email</span><input className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium">Phone</span><input className="mt-1 w-full rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-medium">Location</span><input className="mt-1 w-full rounded border px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
          </div>
        </form>
      );
    }
    if (editing === "summary") {
      const [summary, setSummary] = useState(data.summary ?? "");
      return (
        <form onSubmit={(e) => { e.preventDefault(); setData((d) => ({ ...d, summary })); setEditing(null); }} className="space-y-3">
          <label className="block"><span className="text-sm font-medium">Summary</span>
            <textarea className="mt-1 w-full rounded border px-3 py-2 h-40" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Save</button>
          </div>
        </form>
      );
    }
    return null;
  };

  const Modal = ({ open, onClose, title, children }: any) =>
    !open ? null : (
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Resume Editor</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleShare}>Share</Button>

          {/* Switch template */}
          <select
            className="rounded border px-2 py-2 text-sm"
            value={template.key}
            onChange={(e) => handleSwitchTemplate(e.target.value as any)}
          >
            <option value="chronological">Chronological</option>
            <option value="functional">Functional</option>
            <option value="hybrid">Hybrid</option>
          </select>

          <label htmlFor="filename" className="text-sm font-medium text-gray-700 whitespace-nowrap">File name:</label>
          <input id="filename" type="text" className="flex-1 max-w-md rounded border px-3 py-2 text-sm" value={filename} onChange={(e) => setFilename(e.target.value)} />

          <div className="flex-1" />
          {error ? <span className="text-xs text-red-500">Error: {error}</span> : lastSaved && <span className="text-xs text-gray-500">Saved {lastSaved}</span>}

          <Button onClick={handleSaveAsTemplate}>Save as template</Button>
          <Button onClick={handleSave}>Save</Button>

          {/* Import template JSON */}
          <label className="px-3 py-2 rounded border hover:bg-gray-50 cursor-pointer text-sm">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => handleImportTemplate(e.target.files?.[0] ?? null)} />
            Import template…
          </label>

          <Button onClick={handleExport}>Export</Button>
        </div>
      </div>
      <p className="text-gray-600 mb-6">Loaded: <strong>{template.title}</strong> ({template.key})</p>

      <Suspense fallback={<div className="bg-white shadow rounded p-10 text-sm text-gray-500">Loading preview…</div>}>
        <PreviewComponent data={data} onEdit={setEditing} />
      </Suspense>

      <TemplateSettings />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <details className="w-full">
          <summary className="cursor-pointer text-sm text-gray-600">Preview PDF (optional)</summary>
          <div className="mt-3 border rounded overflow-hidden">
            <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading PDF…</div>}>
              <PDFViewer width="100%" height={700} showToolbar>{pdfDoc}</PDFViewer>
            </Suspense>
          </div>
        </details>

        <Suspense fallback={<button className="px-4 py-2 bg-gray-300 text-white rounded">Preparing…</button>}>
          <PDFDownloadLink document={pdfDoc} fileName={`${filename || "resume"}.pdf`} className="inline-block px-4 py-2 bg-black text-white rounded">
            {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
          </PDFDownloadLink>
        </Suspense>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing}` : "Edit"}>
        <EditorForm />
      </Modal>
    </div>
  );
}
