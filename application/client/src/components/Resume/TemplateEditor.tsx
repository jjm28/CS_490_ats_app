import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Template = {
  id: string;
  name: string;
  type: "chronological" | "functional" | "hybrid" | "custom";
  style: { primary: string; font: string };
  layout: { columns: 1 | 2; sections: string[] };
  ownerId: string | "system";
  origin: "system" | "user" | "import";
  updatedAt: string;
  isDefaultForOwner?: boolean;
};

export default function TemplateEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tpl, setTpl] = useState<Template | null>(null);

  // load from localStorage (frontend-only start)
  useEffect(() => {
    const raw = localStorage.getItem("templates");
    const list: Template[] = raw ? JSON.parse(raw) : [];
    setTpl(list.find(t => t.id === id) || null);
  }, [id]);

  // simple save back to localStorage
  const save = () => {
    if (!tpl) return;
    const raw = localStorage.getItem("templates");
    const list: Template[] = raw ? JSON.parse(raw) : [];
    const next = list.map(t => (t.id === tpl.id ? { ...tpl, updatedAt: new Date().toISOString() } : t));
    localStorage.setItem("templates", JSON.stringify(next));
    nav(-1);
  };

  const set = <K extends keyof Template>(key: K, value: Template[K]) =>
    setTpl(prev => (prev ? { ...prev, [key]: value } : prev));

  if (!tpl) return <div className="p-6">Template not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Customize: {tpl.name}</h1>
      <p className="text-sm text-gray-600 mb-6">Style & Layout preview updates live.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Style</h2>
            <label className="text-sm block mb-1">Primary color</label>
            <input
              type="color"
              value={tpl.style.primary}
              onChange={e => set("style", { ...tpl.style, primary: e.target.value })}
              className="w-16 h-10"
            />
            <label className="text-sm block mt-4 mb-1">Font</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={tpl.style.font}
              onChange={e => set("style", { ...tpl.style, font: e.target.value })}
            >
              <option>Inter</option>
              <option>Georgia</option>
              <option>Times New Roman</option>
              <option>Arial</option>
            </select>
          </section>

          <section className="border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Layout</h2>
            <label className="text-sm block mb-1">Columns</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={tpl.layout.columns}
              onChange={e => set("layout", { ...tpl.layout, columns: Number(e.target.value) as 1 | 2 })}
            >
              <option value={1}>Single column</option>
              <option value={2}>Two columns</option>
            </select>

            <div className="mt-4">
              <label className="text-sm block mb-2">Section order</label>
              {tpl.layout.sections.map((s, i) => (
                <div key={s} className="flex items-center gap-2 mb-2">
                  <span className="text-sm w-32">{s}</span>
                  <button
                    className="border rounded px-2 py-1 text-xs"
                    disabled={i === 0}
                    onClick={() => {
                      const arr = [...tpl.layout.sections];
                      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                      set("layout", { ...tpl.layout, sections: arr });
                    }}
                  >↑</button>
                  <button
                    className="border rounded px-2 py-1 text-xs"
                    disabled={i === tpl.layout.sections.length - 1}
                    onClick={() => {
                      const arr = [...tpl.layout.sections];
                      [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
                      set("layout", { ...tpl.layout, sections: arr });
                    }}
                  >↓</button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-2">
            <button className="border rounded px-3 py-2" onClick={() => nav(-1)}>Cancel</button>
            <button className="bg-black text-white rounded px-3 py-2" onClick={save}>Save</button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 border rounded-xl p-4">
          <LivePreview template={tpl} />
        </div>
      </div>
    </div>
  );
}

function LivePreview({ template }: { template: Template }) {
  const sample = useMemo(() => ({
    name: "Alex Johnson",
    title: "Full-stack Engineer",
    summary: "5+ years building scalable web apps. React, Node, Postgres.",
  }), []);

  return (
    <div style={{ fontFamily: template.style.font }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{sample.name}</h2>
        <span className="text-sm" style={{ color: template.style.primary }}>{sample.title}</span>
      </div>
      <hr className="my-3" />
      <p className="text-sm">{sample.summary}</p>
      <div className="text-xs text-gray-600 mt-3">
        Columns: {template.layout.columns} • Order: {template.layout.sections.join(" » ")}
      </div>
    </div>
  );
}
