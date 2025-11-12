import { useEffect, useMemo, useState } from "react";
import Card from "../StyledComponents/Card";
import { useNavigate } from "react-router-dom";
import { TEMPLATES } from "./Coverletterstore";
import Button from "../StyledComponents/Button";
import { listCoverletters,Getfullcoverletter } from "../../api/coverletter";
import type { CoverletterSummary, ListCoverlettersResponse } from "../../api/coverletter"; 

export default function Coverletter() {
  const navigate = useNavigate();

  const TEMPLATE_MAP = useMemo(
    () => Object.fromEntries(TEMPLATES.map(t => [t.key, t])),
    []
  );

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListCoverlettersResponse>([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  // fetch once on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // safe parse of authUser
        const raw = localStorage.getItem("authUser");
        const user = raw ? JSON.parse(raw).user : null;
        if (!user?._id) throw new Error("Missing user session");

        const res = await listCoverletters({ userid: user._id }); // returns array
        if (!alive) return;
        setItems(res ?? []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load cover letters.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(doc => {
      const t = TEMPLATE_MAP[doc.templateKey];
      const hay = [
        doc.filename,
        doc.templateKey,
        doc.lastSaved,
        t?.title,
        t?.blurb,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, TEMPLATE_MAP]);

  const handleCreateClick = () => navigate("/newcoverletter");
  
const handleImport = async () => {
  try {
    // create a hidden file input dynamically
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        // Validate that it's shaped like your CoverLetterData
        if (
          !json.filename 
          
        ) {
          throw new Error("Invalid file format — missing fields");
        }

        // Load into your editor state
        navigate(`/coverletter/editor`, {
        state: { template: TEMPLATE_MAP[json.templateKey],
         importcoverletterData: json     },
      });
        setErr(null);
        alert("✅ Imported successfully!");
      } catch (err: any) {
        console.error(err);
        setErr("Failed to import file. Make sure it’s a valid JSON export.");
      }
    };

    input.click(); // trigger file picker
  } catch (err: any) {
    setErr("Import failed.");
  }
};

const handleOpen = async (doc: CoverletterSummary) => {
  try {
    // Example: fetch the full cover letter before opening editor
    const user = JSON.parse(localStorage.getItem("authUser") ?? "").user

    const item = await Getfullcoverletter({userid:user._id,coverletterid: doc._id})
    // After successfully fetching, navigate to editor
    navigate(`/coverletter/editor`, {
      state: {
        Coverletterid: doc._id,
        template: TEMPLATE_MAP[doc.templateKey],
        coverletterData: item, 
      },
    });
  } catch (err) {
    console.error("Error opening cover letter:", err);
    alert("Failed to open this cover letter. Please try again.");
  }
};

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">My Cover Letters</h1>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-[380px]">
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm pr-9"
              placeholder="Search by file name, template, or blurb…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌘K</span>
          </div>

          <Button onClick={handleCreateClick}>
            Create A New Coverletter
          </Button>
            <Button onClick={handleImport}>
            Import A New Coverletter
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-sm text-gray-600">
          No results{query ? ` for “${query}”` : ""}. Try a different search or create a new cover letter.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filtered.map((doc) => {
            const tpl = TEMPLATE_MAP[doc.templateKey];
            return (
              <Card
                key={doc._id}
                className="overflow-hidden rounded-2xl shadow-sm bg-white flex flex-col"
              >
                <div className="w-full aspect-3/4 overflow-hidden bg-gray-50">
                  {tpl?.img ? (
                    <img
                      src={tpl.img}
                      alt={doc.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                      No preview
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-lg font-semibold mb-1">{doc.filename}</h2>
                  <p className="text-xs text-gray-500 mb-2">
                    {doc.templateKey ? `Template: ${doc.templateKey}` : "Template: —"}
                    {doc.lastSaved && <> · Saved {doc.lastSaved}</>}
                  </p>
                  {tpl?.blurb && (
                    <p className="text-sm text-gray-600 flex-1">{tpl.blurb}</p>
                  )}
                  <button
                      onClick={() => handleOpen(doc)}
                    className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                  >
                    Open
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
