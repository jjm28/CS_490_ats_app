import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import {
  resumePreviewRegistry,
  resumePdfRegistry,
} from "../../components/Resume";
import type { ResumeData, TemplateKey } from "../../api/resumes";
import {
  saveResume,
  updateResume,
  getFullResume,
  createSharedResume,
} from "../../api/resumes";

/* ---------- Types ---------- */

type LocationState = {
  ResumeId?: string | null;
  template: { key: TemplateKey; title?: string };
  resumeData?: {
    filename: string;
    templateKey: TemplateKey;
    resumedata: ResumeData;
    lastSaved: string | null;
  };
};

type SectionKey =
  | "header"
  | "summary"
  | "skills:add"
  | "experience:add"
  | "experience:edit"
  | "education:add"
  | "education:edit"
  | "project:add"
  | "project:edit";

type AnyIndex = { idx: number } | null;

/* ---------- Helpers ---------- */

function skillNamesToObjects(input: string): Array<{ name: string }> {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function skillsCsv(data: ResumeData) {
  return Array.isArray(data.skills)
    ? data.skills
        .map((s: any) => (typeof s === "string" ? s : s?.name))
        .filter(Boolean)
        .join(", ")
    : "";
}

/* ---------- Component ---------- */

export default function ResumeEditor() {
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;

  const template = state?.template;
  const initialId = state?.ResumeId ?? null;
  const initialPayload = state?.resumeData;

  useEffect(() => {
    if (!template) navigate("/resumes", { replace: true });
  }, [template, navigate]);
  if (!template) return null;

  const [resumeId, setResumeId] = useState<string | null>(initialId);
  const [filename, setFilename] = useState<string>(
    initialPayload?.filename || "Untitled"
  );
  const [data, setData] = useState<ResumeData>(
    initialPayload?.resumedata || {
      name: "Your Name",
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      style: {
        color: { primary: "#111827" },
        font: { family: "Sans" },
        layout: { columns: 1 },
      },
    }
  );
  const [lastSaved, setLastSaved] = useState<string | null>(
    initialPayload?.lastSaved || null
  );
  const [error, setErr] = useState<string | null>(null);

  // reload by id on hard refresh
  useEffect(() => {
    (async () => {
      if (!resumeId) return;
      try {
        const raw = localStorage.getItem("authUser");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.user?._id ?? u?._id ?? null;
        if (!uid) throw new Error("Missing user session");
        const full = await getFullResume({ userid: uid, resumeid: resumeId });
        setFilename(full.filename || "Untitled");
        setData(full.resumedata || data);
        setLastSaved(full.lastSaved || null);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to reload resume.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const Preview = useMemo(
    () => resumePreviewRegistry[template.key],
    [template.key]
  );
  const PdfComp = useMemo(
    () => resumePdfRegistry[template.key],
    [template.key]
  );
  const pdfDoc = useMemo(() => <PdfComp data={data} />, [PdfComp, data]);

  /* ---------- Edit State ---------- */

  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [targetIndex, setTargetIndex] = useState<AnyIndex>(null);

  /* ---------- List Mutators ---------- */

  // Experience
  function addExperience(item: any) {
    setData((d) => ({
      ...d,
      experience: [...(d.experience || []), item],
    }));
  }
  function updateExperience(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.experience || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, experience: arr };
    });
  }
  function removeExperience(idx: number) {
    setData((d) => {
      const arr = [...(d.experience || [])];
      arr.splice(idx, 1);
      return { ...d, experience: arr };
    });
  }

  // Education
  function addEducation(item: any) {
    setData((d) => ({
      ...d,
      education: [...(d.education || []), item],
    }));
  }
  function updateEducation(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.education || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, education: arr };
    });
  }
  function removeEducation(idx: number) {
    setData((d) => {
      const arr = [...(d.education || [])];
      arr.splice(idx, 1);
      return { ...d, education: arr };
    });
  }

  // Projects
  function addProject(item: any) {
    setData((d) => ({
      ...d,
      projects: [...(d.projects || []), item],
    }));
  }
  function updateProject(idx: number, patch: any) {
    setData((d) => {
      const arr = [...(d.projects || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, projects: arr };
    });
  }
  function removeProject(idx: number) {
    setData((d) => {
      const arr = [...(d.projects || [])];
      arr.splice(idx, 1);
      return { ...d, projects: arr };
    });
  }

  // Skills
  function addSkill(name: string) {
    if (!name.trim()) return;
    setData((d) => ({
      ...d,
      skills: [...(d.skills || []), { name: name.trim() }],
    }));
  }
  function removeSkill(i: number) {
    setData((d) => {
      const arr = [...(d.skills || [])];
      arr.splice(i, 1);
      return { ...d, skills: arr };
    });
  }

  /* ---------- Forms ---------- */

  const EditorForm = () => {
    if (!editing) return null;

    // Header
    if (editing === "header") {
      const [name, setName] = useState(String(data.name || ""));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, name }));
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
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

    // Summary
    if (editing === "summary") {
      const [summary, setSummary] = useState(String(data.summary || ""));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, summary }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Summary</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-36"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
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

    // Skills: add via CSV
    if (editing === "skills:add") {
      const [csv, setCsv] = useState(skillsCsv(data));
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setData((d) => ({ ...d, skills: skillNamesToObjects(csv) }));
            setEditing(null);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Skills (comma-separated)</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => setEditing(null)}
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

    // Experience: add & edit share the same form
    if (editing === "experience:add" || editing === "experience:edit") {
      const idx = (targetIndex as AnyIndex)?.idx ?? -1;
      const initial =
        editing === "experience:edit" && data.experience && data.experience[idx]
          ? data.experience[idx]
          : {};
      const [company, setCompany] = useState(initial.company || "");
      const [jobTitle, setJobTitle] = useState(initial.jobTitle || "");
      const [startDate, setStartDate] = useState(initial.startDate || "");
      const [endDate, setEndDate] = useState(initial.endDate || "");
      const [location, setLocation] = useState(initial.location || "");
      const [highlights, setHighlights] = useState(
        Array.isArray(initial.highlights)
          ? initial.highlights.join("\n")
          : ""
      );
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const item = {
              company,
              jobTitle,
              startDate,
              endDate: endDate || null,
              location,
              highlights: (typeof highlights === "string" ? highlights : "")
              .split("\n")
              .map((h) => String(h).trim())
              .filter(Boolean),
            };
            if (editing === "experience:add") addExperience(item);
            else updateExperience(idx, item);
            setEditing(null);
            setTargetIndex(null);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Company</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Job Title</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Start</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">End (optional)</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM or blank"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Location (optional)</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Highlights (one per line)</span>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 h-28"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => {
                setEditing(null);
                setTargetIndex(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              {editing === "experience:add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      );
    }

    // Education: add & edit
    if (editing === "education:add" || editing === "education:edit") {
      const idx = (targetIndex as AnyIndex)?.idx ?? -1;
      const initial =
        editing === "education:edit" && data.education && data.education[idx]
          ? data.education[idx]
          : {};
      const [institution, setInstitution] = useState(initial.institution || "");
      const [degree, setDegree] = useState(initial.degree || "");
      const [fieldOfStudy, setFieldOfStudy] = useState(
        initial.fieldOfStudy || ""
      );
      const [graduationDate, setGraduationDate] = useState(
        initial.graduationDate || ""
      );

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const item = { institution, degree, fieldOfStudy, graduationDate };
            if (editing === "education:add") addEducation(item);
            else updateEducation(idx, item);
            setEditing(null);
            setTargetIndex(null);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Institution</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Degree</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Field of study</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Graduation date</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="YYYY-MM"
                value={graduationDate}
                onChange={(e) => setGraduationDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => {
                setEditing(null);
                setTargetIndex(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              {editing === "education:add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      );
    }

    // Projects: add & edit
    const idx = (targetIndex as AnyIndex)?.idx ?? -1;
    const initial =
      editing === "project:edit" && data.projects && data.projects[idx]
        ? data.projects[idx]
        : {};
    const [name, setName] = useState(initial.name || "");
    const [technologies, setTechnologies] = useState(
      initial.technologies || ""
    );
    const [outcomes, setOutcomes] = useState(initial.outcomes || "");

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const item = { name, technologies, outcomes };
          if (editing === "project:add") addProject(item);
          else updateProject(idx, item);
          setEditing(null);
          setTargetIndex(null);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Project name</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Technologies</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Outcomes / notes</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 h-24"
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-100"
            onClick={() => {
              setEditing(null);
              setTargetIndex(null);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-emerald-600 text-white"
          >
            {editing === "project:add" ? "Add" : "Save"}
          </button>
        </div>
      </form>
    );
  };

  /* ---------- Actions ---------- */

  const handleSave = async () => {
    try {
      setErr(null);
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid) throw new Error("Missing user session");
      const ts = new Date().toLocaleTimeString();

      if (!resumeId) {
        const created = await saveResume({
          userid: uid,
          filename,
          templateKey: template.key,
          resumedata: data,
          lastSaved: ts,
        });
        setResumeId(created?._id || created?.resumeid || null);
        setLastSaved(ts);
        alert("Saved.");
      } else {
        await updateResume({
          resumeid: resumeId,
          userid: uid,
          filename,
          resumedata: data,
          lastSaved: ts,
          templateKey: template.key,
        });
        setLastSaved(ts);
        alert("Updated.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Save failed.");
    }
  };

  const handleShare = async () => {
    try {
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.user?._id ?? u?._id ?? null;
      if (!uid || !resumeId) throw new Error("Missing session or resume id");
      const out = await createSharedResume({
        userid: uid,
        resumeid: resumeId,
        resumedata: data,
      });
      await navigator.clipboard.writeText(out.url);
      alert("Share link copied!");
    } catch (e: any) {
      setErr(e?.message ?? "Share failed.");
    }
  };

  const handleExport = () => {
    const payload = {
      filename,
      templateKey: template.key,
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

  /* ---------- UI ---------- */

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold mb-2">Resume Editor</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleShare}>Share</Button>
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            File name:
          </label>
          <input
            className="flex-1 max-w-md rounded border px-3 py-2 text-sm"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <div className="flex-1" />
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
        Loaded template: <strong>{template.title || template.key}</strong>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: editors + lists */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold mb-2 text-center">Quick Editors</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("header")}
              >
                Edit Name
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("summary")}
              >
                Edit Summary
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("skills:add")}
              >
                Edit Skills
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("experience:add")}
              >
                Add Experience
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("education:add")}
              >
                Add Education
              </button>
              <button
                className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                onClick={() => setEditing("project:add")}
              >
                Add Project
              </button>
            </div>
            {editing && (
              <div className="rounded border p-4 mt-3">
                <EditorForm />
              </div>
            )}
          </div>

          {/* Skills chip editor */}
          <div className="rounded border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Skills</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const inp = form.elements.namedItem("newSkill") as HTMLInputElement;
                  addSkill(inp.value);
                  inp.value = "";
                }}
                className="flex gap-2"
              >
                <input
                  name="newSkill"
                  placeholder="Add a skill"
                  className="rounded border px-2 py-1 text-sm"
                />
                <button className="rounded px-3 py-1 text-xs border hover:bg-gray-50">
                  Add
                </button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.skills || []).map((s: any, i: number) => {
                const label = typeof s === "string" ? s : s?.name;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                  >
                    {label}
                    <button
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => removeSkill(i)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Experience list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Experience</h3>
            <ul className="space-y-2">
              {(data.experience || []).map((e: any, i: number) => (
                <li key={i} className="text-sm flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {(e?.jobTitle || "Title")} • {(e?.company || "Company")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(e?.startDate || "")} – {(e?.endDate || "Present")}
                      {e?.location ? ` • ${e.location}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("experience:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeExperience(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.experience || []).length === 0 && (
                <li className="text-xs text-gray-500">No experience added yet.</li>
              )}
            </ul>
          </div>

          {/* Education list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Education</h3>
            <ul className="space-y-2">
              {(data.education || []).map((ed: any, i: number) => (
                <li key={i} className="text-sm flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {(ed?.degree || "Degree")}
                      {ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(ed?.institution || "School")}
                      {ed?.graduationDate ? ` • ${ed.graduationDate}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("education:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeEducation(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.education || []).length === 0 && (
                <li className="text-xs text-gray-500">No education added yet.</li>
              )}
            </ul>
          </div>

          {/* Projects list */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-2">Projects</h3>
            <ul className="space-y-2">
              {(data.projects || []).map((p: any, i: number) => (
                <li key={i} className="text-sm flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p?.name || "Project"}</div>
                    {p?.technologies && (
                      <div className="text-xs text-gray-500">{p.technologies}</div>
                    )}
                    {p?.outcomes && <div className="text-xs">{p.outcomes}</div>}
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="text-xs underline"
                      onClick={() => {
                        setTargetIndex({ idx: i });
                        setEditing("project:edit");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 underline"
                      onClick={() => removeProject(i)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {(data.projects || []).length === 0 && (
                <li className="text-xs text-gray-500">No projects added yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="border rounded p-3">
          <Suspense fallback={<div className="text-sm text-gray-500 p-6">Loading preview…</div>}>
            <Preview data={data} onEdit={(s: any) => setEditing(s)} />
          </Suspense>
        </div>
      </div>

      {/* PDF */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <details className="w-full">
          <summary className="cursor-pointer text-sm text-gray-600">
            Preview PDF (optional)
          </summary>
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
