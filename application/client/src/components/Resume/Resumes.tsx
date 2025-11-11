import { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { useNavigate } from "react-router-dom";
import { listResumes, getFullResume, updateResume, deleteResume, saveResume } from "../../api/resumes";
import type {TemplateKey} from "../../api/templates"

type ResumeSummary = { 
  _id: string; 
  filename: string; 
  templateKey: TemplateKey; 
  lastSaved?: string; 
  tags?: string 
};

const TEMPLATES = [
  { key: "chronological", title: "Chronological" },
  { key: "functional", title: "Functional" },
  { key: "hybrid", title: "Hybrid" },
];

export default function Resumes() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  const TPL = useMemo(() => Object.fromEntries(TEMPLATES.map(t => [t.key, t])), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const raw = localStorage.getItem("authUser");
        const user = raw ? JSON.parse(raw) : null;
        if (!user?._id) throw new Error("Missing user session");
        const res = await listResumes({ userid: user._id });
        if (!alive) return;
        setItems(res ?? []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load resumes.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const tagFilter = q.startsWith("tag:") ? q.slice(4) : null;
    return items.filter(doc => {
      const tpl = TPL[doc.templateKey];
      const hay = [doc.filename, doc.templateKey, doc.lastSaved, tpl?.title, doc.tags]
        .filter(Boolean).join(" ").toLowerCase();
      if (tagFilter) return (doc.tags ?? "").toLowerCase().includes(tagFilter);
      return hay.includes(q);
    });
  }, [items, query, TPL]);

  const handleCreateClick = () => navigate("/resumes/new");

  const openEditor = async (doc: ResumeSummary) => {
  const raw = localStorage.getItem("authUser");
  const user = raw ? JSON.parse(raw) : null;
  if (!user?._id) return;

  // 1) Fetch the full document from API
  const apiFull = await getFullResume({ userid: user._id, resumeid: doc._id });

  // 2) Normalize to what the editor expects
  const resumeData = {
    filename: apiFull?.filename ?? doc.filename,
    templateKey: (apiFull?.templateKey ?? doc.templateKey) as TemplateKey,
    resumedata: apiFull?.resumedata ?? {},
    lastSaved: apiFull?.lastSaved ?? apiFull?.updatedAt ?? apiFull?.createdAt ?? doc.lastSaved ?? null,
  };

  
  navigate("/resumes/editor", {
    state: {
      ResumeId: doc._id,
      template: TPL[resumeData.templateKey], 
      resumeData,
    },
  });
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
              placeholder='Search… (tip: use "tag:backend")'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌘K</span>
          </div>
          <Button onClick={handleCreateClick}>Create New Resume</Button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600">No results{query ? ` for “${query}”` : ""}.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filtered.map((doc) => {
            const tpl = TPL[doc.templateKey];
            return (
              <Card key={doc._id} className="overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col">
                <div className="w-full aspect-3/4 overflow-hidden bg-gray-50">
                  <div className="w-full h-full grid place-items-center text-gray-400 text-sm">No preview</div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-lg font-semibold mb-1">{doc.filename}</h2>
                  <p className="text-xs text-gray-500 mb-2">
                    {doc.templateKey ? `Template: ${tpl?.title ?? doc.templateKey}` : "Template: —"}
                    {doc.lastSaved && <> · Saved {doc.lastSaved}</>}
                  </p>

                  {/* Tags */}
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                    placeholder="tags (comma-separated)"
                    value={doc.tags ?? ""}
                    onChange={(e) =>
                      setItems((prev) => prev.map(r => r._id === doc._id ? { ...r, tags: e.target.value } : r))
                    }
                    onBlur={async (e) => {
                    const raw = localStorage.getItem("authUser");
                    const user = raw ? JSON.parse(raw) : null;
                    if (!user?._id) return;

                    const full = await getFullResume({ userid: user._id, resumeid: doc._id });

                    const nextResumedata = {
                      ...(full.resumedata ?? {}),
                      meta: { ...(full.resumedata?.meta ?? {}), tags: e.target.value },
                    };

                    await updateResume({
                      resumeid: doc._id,
                      userid: user._id,
                      resumedata: nextResumedata,
                    });
                  }}
                  />

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    {/* Rename inline */}
                    <input
                      className="flex-1 rounded border px-2 py-1 text-sm"
                      value={doc.filename}
                      onChange={(e) => {
                        const filename = e.target.value;
                        setItems((prev) => prev.map(r => r._id === doc._id ? { ...r, filename } : r));
                      }}
                      onBlur={async (e) => {
                        try {
                          const raw = localStorage.getItem("authUser");
                          const user = raw ? JSON.parse(raw) : null;
                          await updateResume({ resumeid: doc._id, userid: user._id, filename: e.target.value });
                        } catch {}
                      }}
                    />

                    <button
                      className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                      onClick={() => openEditor(doc)}
                    >
                      Open
                    </button>

                    <button
                      className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                      onClick={async () => {
                        const raw = localStorage.getItem("authUser");
                        const user = raw ? JSON.parse(raw) : null;
                        await deleteResume({ resumeid: doc._id, userid: user._id });
                        setItems((prev) => prev.filter(r => r._id !== doc._id));
                      }}
                    >
                      Delete
                    </button>

                    <button
                      className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
                        onClick={async () => {
                          try {
                            // get user from API (cookie-based session)
                            const API = import.meta.env.VITE_API_BASE_URL ?? "";
                            const meRes = await fetch(`${API}/api/me`, { credentials: "include" });
                            if (!meRes.ok) throw new Error("Not authenticated");
                            const me: { _id: string } = await meRes.json();
                            const userid = me._id;

                            // fetch full doc to copy
                            const full = await getFullResume({ userid, resumeid: doc._id });

                            // create the copy
                            const created = await saveResume({
                              userid,
                              filename: `${doc.filename} (copy)`,
                              templateKey: doc.templateKey as TemplateKey,
                              resumedata: full?.resumedata ?? {},
                              lastSaved: new Date().toISOString(),
                            });

                            // normalize new id from backend
                            const newId =
                              (created as any)?._id ??
                              (created as any)?.id ??
                              (created as any)?.resumeid;

                            if (!newId) return;

                            // update UI list (avoid duplicate `_id`)
                            const { _id: _old, ...rest } = doc;
                            setItems(prev => [{ ...rest, _id: newId, filename: `${doc.filename} (copy)` }, ...prev]);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        Duplicate
                      </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
