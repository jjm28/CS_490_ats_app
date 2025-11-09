// application/client/src/components/Resume/TemplateLibrary.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import API_BASE from "../../utils/apiBase";
import { fullSeedContent } from "../Resume/fullseed";
import { deleteTemplate as apiDeleteTemplate, getDefaultTemplate, importTemplate, setDefaultTemplate } from "../../api/templates"

type TemplateType = "chronological" | "functional" | "hybrid" | "custom";

type Template = {
  _id: string;
  name: string;
  type: TemplateType;
  style?: { primary?: string; font?: string };
  layout?: { columns?: 1 | 2; sections?: string[] };
  // isDefaultForOwner?: boolean;  // <- we won't rely on this anymore
};

type Resume = {
  _id: string;
  name: string;
  templateId?: string;
  content?: any;
};

function authHeaders() {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  const dev = localStorage.getItem("devUserId");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(dev ? { "x-dev-user-id": dev } : {}),
  };
}

async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(`${API_BASE}/api/templates`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`List templates failed: ${res.status}`);
  return res.json();
}

async function createResume(payload: {
  name: string;
  templateId?: string;
  content?: any;
}): Promise<Resume> {
  const res = await fetch(`${API_BASE}/api/resumes`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Create resume failed");
  }
  return data;
}

function seedFromTemplate(tpl: Template) {
  return {
    templateType: tpl.type,
    style: tpl.style || { primary: "#0ea5e9", font: "Inter" },
    layout: tpl.layout || { columns: 1, sections: [] },
  };
}

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTpl, setDefaultTpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function clickImport() {
    fileRef.current?.click();
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [tplList, defTpl] = await Promise.all([
          fetchTemplates(),
          getDefaultTemplate().catch(() => null),
        ]);
        setTemplates(Array.isArray(tplList) ? tplList : []);

        // Be defensive: backend might return full template or just {_id} or {id}
        if (defTpl && (defTpl as any)._id) {
          setDefaultTpl(defTpl as Template);
        } else if (defTpl && (defTpl as any).id) {
          const found = (tplList || []).find(
            (t) => t._id === (defTpl as any).id
          );
          setDefaultTpl(found || null);
        } else {
          setDefaultTpl(null);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load templates.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = templates.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = [t.name, t.type, ...(t.layout?.sections || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  async function onUseTemplate(tpl: Template) {
    const input = window.prompt("Name your resume:", `${tpl.name}`);
    if (input === null) {
      navigate("/templates");
      return;
    }
    const name = input.trim() || tpl.name;
    try {
      const created = await createResume({
        name,
        templateId: tpl._id,
        content: seedFromTemplate(tpl),
      });
      navigate(`/resumes/${created._id}/edit`, { state: { draft: true } });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Could not create resume.");
    }
  }

  async function createFromScratch() {
    const input = window.prompt("Name your resume:", "Untitled Resume");
    if (input === null) return;
    const name = input.trim() || "Untitled Resume";
    try {
      const created = await createResume({
        name,
        content: fullSeedContent(),
      });
      navigate(`/resumes/${created._id}/edit`, { state: { draft: true } });
    } catch (e: any) {
      alert(e?.message || "Could not create resume.");
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset
    if (!file) return;

    const isJson = file.type === "application/json" || /\.json$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(file.name);

    try {
      if (isJson) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!json.name || typeof json.name !== "string") {
          alert("Template JSON must include a string 'name'.");
          return;
        }
        const newName =
          window.prompt("Name for imported template:", json.name) ?? json.name;
        const payload = {
          name: (newName || json.name).trim(),
          type: json.type || "custom",
          style: json.style || {},
          layout: json.layout || {},
          previewHtml: json.previewHtml || null,
        };
        await importTemplate(payload);
      } else if (isPdf || isDocx) {
        const fd = new FormData();
        fd.append("file", file);
        const suggested = file.name.replace(/\.(pdf|docx)$/i, "");
        const name =
          window.prompt("Name for imported template:", suggested) ?? suggested;
        if (name && name.trim()) fd.append("name", name.trim());

        const base = authHeaders();
        const uploadHeaders: Record<string, string> = {};
        if ((base as any).Authorization)
          uploadHeaders["Authorization"] = (base as any).Authorization;
        if ((base as any)["x-dev-user-id"])
          uploadHeaders["x-dev-user-id"] = (base as any)["x-dev-user-id"];

        const res = await fetch(`${API_BASE}/api/templates/import-file`, {
          method: "POST",
          credentials: "include",
          headers: uploadHeaders, // no Content-Type with FormData
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || "Import failed");
      } else {
        alert("Unsupported file type. Please pick a JSON, PDF, or DOCX file.");
        return;
      }

      const list = await fetchTemplates();
      setTemplates(Array.isArray(list) ? list : []);
      try {
        const def = await getDefaultTemplate().catch(() => null);
        if (def && (def as any)._id) setDefaultTpl(def as Template);
        else if (def && (def as any).id) {
          const found = list.find((t) => t._id === (def as any).id);
          setDefaultTpl(found || null);
        } else setDefaultTpl(null);
      } catch {}
      alert("Template imported.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to import template.");
    }
  }

  async function onUseDefault() {
    if (!defaultTpl?._id) {
      alert("No default template set yet.");
      return;
    }
    const input = window.prompt("Name your resume:", `${defaultTpl.name}`);
    if (input === null) return;
    const name = input.trim() || defaultTpl.name;
    try {
      const created = await createResume({
        name,
        templateId: defaultTpl._id,
        content: seedFromTemplate(defaultTpl),
      });
      navigate(`/resumes/${created._id}/edit`, { state: { draft: true } });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Could not create resume.");
    }
  }

  async function onSetDefault(id: string) {
  try {
    await setDefaultTemplate(id);
    const [list, def] = await Promise.all([
      fetchTemplates(),
      getDefaultTemplate().catch(() => null),
    ]);
    setTemplates(Array.isArray(list) ? list : []);
    setDefaultTpl(def ?? null);
  } catch (e: any) {
    alert(e?.message || "Could not set default");
  }
}



// augment the Template type a bit so we can hide Delete for system templates
type TemplateOrigin = "system" | "user" | "import" | "custom";
type Template = {
  _id: string;
  name: string;
  type: TemplateType;
  style?: { primary?: string; font?: string };
  layout?: { columns?: 1 | 2; sections?: string[] };
  isDefaultForOwner?: boolean;
  origin?: TemplateOrigin;             // <— add this
  isFileTemplate?: boolean;            // optional, used on server
};

// inside component:
async function onDeleteTemplate(tpl: Template) {
  const warn = tpl.isDefaultForOwner
    ? `Delete "${tpl.name}"? This is currently your default template.`
    : `Delete "${tpl.name}"?`;

  if (!window.confirm(warn)) return;

  try {
    await apiDeleteTemplate(tpl._id);
    // Refresh list and default in one go
    const [listRes, defRes] = await Promise.allSettled([
      fetchTemplates(),
      getDefaultTemplate(),
    ]);
    if (listRes.status === "fulfilled") setTemplates(listRes.value);
    setDefaultTpl(defRes.status === "fulfilled" ? (defRes.value as any) : null);
  } catch (e: any) {
    alert(e?.message || "Delete failed");
  }
}

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
          <div className="text-sm text-gray-600 mt-1">
            Current default:{" "}
            <span className="font-medium">
              {defaultTpl ? defaultTpl.name : "None selected"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onUseDefault}>Use default template</Button>
          <Button onClick={clickImport}>Import template</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
            onChange={onImportFile}
            style={{ display: "none" }}
          />
          <Button onClick={createFromScratch}>New from scratch</Button>
          <input
            className="form-input w-[260px]"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const isDefault = defaultTpl?._id === tpl._id; // <- compute default here
            return (
              <Card key={tpl._id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {tpl.type}
                      {isDefault ? (
                        <span className="ml-2 inline-block rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px]">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="size-5 rounded"
                    style={{
                      background: tpl.style?.primary || "var(--brand-teal, #0ea5e9)",
                    }}
                    title={tpl.style?.primary || "#0ea5e9"}
                  />
                </div>

                <div className="text-sm text-gray-700">
                  <div className="mb-1 font-medium">Sections</div>
                  <div className="flex flex-wrap gap-1">
                    {(tpl.layout?.sections || []).length === 0 ? (
                      <span className="text-gray-500">No sections</span>
                    ) : (
                      tpl.layout!.sections!.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-2 flex gap-2">
                  <Button variant="primary" onClick={() => onUseTemplate(tpl)}>
                    Use
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/templates/${tpl._id}/preview`)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant={isDefault ? "primary" : "secondary"}
                    onClick={() => onSetDefault(tpl._id)}
                  >
                    {isDefault ? "Default" : "Set default"}
                  </Button>

                  {tpl.origin !== "system" && (
                    <Button
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => onDeleteTemplate(tpl)}
                    >
                    Delete
                    </Button>
                  )};
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <Card>No templates match your search.</Card>
      )}
    </div>
  );
}
