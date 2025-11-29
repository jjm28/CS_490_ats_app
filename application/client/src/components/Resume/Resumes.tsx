// application/client/src/components/Resume/Resumes.tsx
import { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { useNavigate } from "react-router-dom";
import type { ResumeSummary, ResumeData, TemplateKey } from "../../api/resumes";
import { listResumes, getFullResume, deleteResumeApi } from "../../api/resumes";
import { listResumeTemplates } from "../../api/templates";

type Row = ResumeSummary & { templateTitle?: string };

function getUserId(): string | null {
  const raw = localStorage.getItem("authUser");
  const u = raw ? JSON.parse(raw) : null;
  return (
    u?._id ?? u?.id ?? u?.userId ?? u?.userid ??
    u?.user?._id ?? u?.user?.id ?? u?.user?.userId ?? u?.user?.userid ?? null
  );
}

export default function Resumes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const userid = getUserId();
      if (!userid) throw new Error("Missing user session");
      const [rows, templates] = await Promise.all([
        listResumes({ userid }),
        listResumeTemplates({ userid }).catch(() => []),
      ]);
      const titleByKey = Object.fromEntries(
        (templates || []).map((t: any) => [t.templateKey, t.title || t.templateKey])
      );
      setItems(
        (rows || []).map((r: ResumeSummary) => ({
          ...r,
          templateTitle: titleByKey[r.templateKey] || r.templateKey,
        }))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load resumes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(r => {
      const hay = [
        r.filename,
        r.templateKey,
        r.templateTitle,
        r.tags,
        r.lastSaved,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const handleOpen = async (doc: ResumeSummary) => {
    try {
      const userid = getUserId();
      if (!userid) throw new Error("Missing user session");
      const full = await getFullResume({ userid, resumeid: doc._id });
      navigate("/resumes/editor", {
        state: {
          ResumeId: doc._id,
          template: { key: doc.templateKey as TemplateKey, title: doc.templateKey },
          resumeData: full,
        },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to open this resume.");
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          if (!json?.templateKey || !json?.resumedata) throw new Error("Invalid file.");

          navigate("/resumes/editor", {
            state: {
              ResumeId: null,
              template: { key: json.templateKey as TemplateKey, title: json.templateKey },
              resumeData: json,
            },
          });
        } catch {
          alert("Import failed. Ensure the JSON came from Export.");
        }
      };
      input.click();
    } catch {
      alert("Import failed.");
    }
  };

  const handleDelete = async (doc: ResumeSummary) => {
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    try {
      const userid = getUserId();
      if (!userid) throw new Error("Missing user session");
      await deleteResumeApi({ userid, resumeid: doc._id });
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">My Resumes</h1>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-[380px]">
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm pr-9"
              placeholder="Search by file name, template, or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌘K</span>
          </div>
          <Button onClick={() => navigate("/resumes/new")}>Create New</Button>
          <Button onClick={handleImport}>Import JSON</Button>
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600">
          No results{query ? ` for “${query}”` : ""}. Try a different search or create a new resume.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filtered.map((doc) => (
            <Card key={doc._id} className="overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col">
                  <div className="flex-1 bg-gray-50 rounded-t-xl">
                    {/* reserved for future thumbnail preview */}
                  </div>
              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-lg font-semibold mb-1">{doc.filename}</h2>
                <p className="text-xs text-gray-500 mb-2">
                  Template: {doc.templateKey} {doc.lastSaved ? `· Saved ${doc.lastSaved}` : ""}
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <button className="rounded px-3 py-1 text-xs border hover:bg-gray-50" onClick={() => handleOpen(doc)}>
                    Open
                  </button>
                  <button className="rounded px-3 py-1 text-xs border hover:bg-gray-50" onClick={() => handleDelete(doc)}>
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
