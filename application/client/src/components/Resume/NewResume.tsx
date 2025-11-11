import { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import { useNavigate } from "react-router-dom";
import { getDefaultResumeTemplate, setDefaultResumeTemplate } from "../../api/templates";
import type { TemplateKey } from "../../api/templates";

const RESUME_TEMPLATES = [
  { key: "chronological" as const, title: "Chronological", blurb: "Experience-first layout", img: "" },
  { key: "functional"    as const, title: "Functional",    blurb: "Skills-first layout",    img: "" },
  { key: "hybrid"        as const, title: "Hybrid",        blurb: "Skills + Experience",    img: "" },
];

export default function NewResume() {
  const navigate = useNavigate();
  const [active, setActive] = useState<(typeof RESUME_TEMPLATES)[number] | null>(null);
  const [defaultKey, setDefaultKey] = useState<TemplateKey | null>(null);
  const [loadingDefault, setLoadingDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const templateMap = useMemo(
    () => Object.fromEntries(RESUME_TEMPLATES.map(t => [t.key, t] as const)),
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingDefault(true);
        setError(null);
        const raw = localStorage.getItem("authUser");
        const user = raw ? JSON.parse(raw) : null;
        const userid = user?._id ?? "";
        const token = user?.token ?? undefined;
        if (!userid) throw new Error("Missing user session");
        const { templateKey } = await getDefaultResumeTemplate({ userid, token });
        if (!alive) return;
        setDefaultKey(templateKey ?? null);
        if (!active && templateKey && templateMap[templateKey]) {
          setActive(templateMap[templateKey]);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load default template.");
      } finally {
        if (alive) setLoadingDefault(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreview = (t: (typeof RESUME_TEMPLATES)[number]) => setActive(t);

  const handleSelect = () => {
    const chosen = active ?? (defaultKey ? templateMap[defaultKey] : null);
    if (!chosen) return;
    navigate("/resumes/editor", { state: { template: chosen } });
  };

  const handleSetDefault = async (t: (typeof RESUME_TEMPLATES)[number]) => {
    try {
      setError(null);
      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw) : null;
      const userid = user?._id ?? "";
      const token = user?.token ?? undefined;
      if (!userid) throw new Error("Missing user session");
      await setDefaultResumeTemplate({ userid, templateKey: t.key, token });
      setDefaultKey(t.key);
      if (!active) setActive(t);
    } catch (e: any) {
      setError(e?.message ?? "Failed to set default template.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Select a resume template</h1>
        <div className="text-sm text-gray-600">
          {loadingDefault ? "Loading default…" : defaultKey ? `Default: ${templateMap[defaultKey]?.title}` : "No default set"}
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {RESUME_TEMPLATES.map((t) => {
          const isDefault = defaultKey === t.key;
          const isActive = active?.key === t.key;

          return (
            <Card key={t.key} className={`relative overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col ${isActive ? "ring-2 ring-emerald-600" : ""}`}>
              {isDefault && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-600/90 text-white text-[11px] font-semibold px-3 py-1 shadow">
                  Default
                </span>
              )}

              <div className="w-full aspect-3/4 overflow-hidden bg-gray-50">
                {t.img ? (
                  <img src={t.img} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-400 text-sm">No preview</div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-1">{t.title}</h2>
                <p className="text-sm text-gray-600 flex-1">{t.blurb}</p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(t)}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleSetDefault(t)}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 transition"
                    aria-pressed={isDefault}
                    title={isDefault ? "This is already your default" : "Set as default"}
                  >
                    {isDefault ? "Default ✓" : "Set default"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <button onClick={() => navigate("/resumes")} className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200">
          Cancel
        </button>
        <button onClick={handleSelect} className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
          Use Selected
        </button>
      </div>
    </div>
  );
}
