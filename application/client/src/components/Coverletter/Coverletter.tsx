import { useEffect, useState } from "react";
import Card from "../StyledComponents/Card"; // adjust to your path

type Template = {
  key: "formal" | "creative" | "technical";
  title: string;
  img: string;
  blurb?: string;
};

const TEMPLATES: Template[] = [
  {
    key: "formal",
    title: "Formal Template",
    img: "https://cdn-images.zety.com/pages/formal-cover-letter-example-ztus-cta1-cover-letter.webp",
    blurb: "Classic business layout for corporate and government roles.",
  },
  {
    key: "creative",
    title: "Creative Template",
    img: "https://cdn-images.zety.com/pages/formal-cover-letter-example-ztus-cta1-cover-letter.webp",
    blurb: "Bold headings and modern typography for design/marketing.",
  },
  {
    key: "technical",
    title: "Technical Template",
    img: "https://cdn-images.zety.com/pages/formal-cover-letter-example-ztus-cta1-cover-letter.webp",
    blurb: "Minimalist, skills-first layout for SWE/Data/IT roles.",
  },
];


// ...imports and TEMPLATES unchanged...

export default function Coverletter({
  onSelect,
}: {
  onSelect?: (key: "formal" | "creative" | "technical") => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<(typeof TEMPLATES)[number] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handlePreview = (t: (typeof TEMPLATES)[number]) => {
    setActive(t);
    setOpen(true);
  };

  const handleSelect = () => {
    if (active?.key && onSelect) onSelect(active.key);
    setOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-center mb-8">
        Select a cover letter template
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TEMPLATES.map((t) => (
          <Card
            key={t.key}
            className="overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col"
          >
            <div className="w-full aspect-[3/4] overflow-hidden">
              <img
                src={t.img}
                alt={t.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="p-5 flex flex-col flex-1">
              <h2 className="text-xl font-semibold mb-2">{t.title}</h2>
              <p className="text-sm text-gray-600 flex-1">{t.blurb}</p>
              <button
                onClick={() => handlePreview(t)}
                className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                Preview
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {open && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}    
           <div className="relative w-[92vw] max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col outline-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200/70">
              <h3 className="text-lg font-semibold">{active.title}</h3>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
              <div className="rounded-lg bg-white overflow-hidden">
                <img
                  src={active.img}
                  alt={`${active.title} preview`}
                 className="block w-full h-auto select-none" 
                />
              </div>
              {active.blurb && (
                <p className="text-sm text-gray-600 mt-3">{active.blurb}</p>
              )}
            </div>

            {/* Sticky footer (always visible) */}
            <div className="shrink-0 sticky bottom-0 px-4 md:px-6 py-3 border-t border-gray-200/70 bg-white">              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSelect}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Select Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
