import React, { useEffect, useRef, useState } from "react";
import { computeReadability } from "../../utils/readabilityUtils";

type Props = {
  value: string[] | string;
  onChange: (cleanParagraphs: string[]) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  /* ----------------------------------
        INITIAL VALUE
  -----------------------------------*/
  const [html, setHtml] = useState<string>(() => {
    if (Array.isArray(value)) return value.join("\n\n");
    return value || "";
  });

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setHtml(e.currentTarget.innerHTML);
  };

  useEffect(() => {
    if (editorRef.current && !didInit.current) {
      editorRef.current.innerHTML = html;
      didInit.current = true;
    }
  }, []);

  /* ----------------------------------
        VERSION HISTORY
  -----------------------------------*/
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    if (!html) return;
    const t = setTimeout(() => {
      setHistory((h) => [...h.slice(-4), html]);
    }, 1200);
    return () => clearTimeout(t);
  }, [html]);

  /* ----------------------------------
        READABILITY
  -----------------------------------*/
  const [readability, setReadability] = useState({
    grade: 0,
    score: 100,
    category: "easy" as "easy" | "medium" | "hard",
  });

  function stripFormatting(str: string) {
    const div = document.createElement("div");
    div.innerHTML = str;
    return div.innerText.replace(/\s+/g, " ").trim();
  }

  useEffect(() => {
    setReadability(computeReadability(stripFormatting(html)));
  }, [html]);

  /* ----------------------------------
        SYNONYMS
  -----------------------------------*/
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [synonyms, setSynonyms] = useState<string[]>([]);

  async function fetchSynonyms(word: string) {
    try {
      const res = await fetch(
        `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}`
      );
      const data = await res.json();
      setSynonyms(data.slice(0, 8).map((w: any) => w.word));
    } catch {
      setSynonyms([]);
    }
  }

  function handleSelection() {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) {
      setSelectedWord(null);
      setSynonyms([]);
      return;
    }

    const word = sel.toString().trim();
    setSelectedWord(word);
    fetchSynonyms(word);
  }

  function replaceWord(original: string, replacement: string) {
    const updated = html.replace(new RegExp(`\\b${original}\\b`, "gi"), replacement);
    setHtml(updated);
    if (editorRef.current) editorRef.current.innerHTML = updated;
    setSelectedWord(null);
    setSynonyms([]);
  }

  /* ----------------------------------
        IMPROVEMENT PANEL
  -----------------------------------*/
  const [improvementTips, setImprovementTips] = useState<string[] | null>(null);

  /* ----------------------------------
        CLEAN PARAGRAPHS — FIXED
  -----------------------------------*/
function extractParagraphs() {
  // 1) Convert HTML → clean plain text with preserved paragraph boundaries
  let cleaned = html
    .replace(/<\/p>|<\/div>/gi, "\n\n") // closing tags → paragraph breaks
    .replace(/<br\s*\/?>/gi, "\n")     // line breaks
    .replace(/<[^>]+>/g, "")           // remove any other HTML tags
    .replace(/\u00A0/g, " ")           // NBSP → space
    .replace(/\r/g, "")                // kill carriage returns
    .replace(/[ \t]+/g, " ")           // normalize spaces
    .trim();

  // 2) Split by multiple line breaks = paragraphs
  let paras = cleaned
    .split(/\n{2,}/)        // paragraph break
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // 3) Guarantee PDF-safe fallback
  if (paras.length === 0) paras = [" "];

  return paras;
}


  /* ----------------------------------
        SAVE
  -----------------------------------*/
  function handleSave() {
    const paras = extractParagraphs();
    onChange(paras);
  }

  /* ----------------------------------
        AI HELPERS
  -----------------------------------*/
  function getSelectedText() {
    const sel = window.getSelection();
    return sel && sel.toString().trim() ? sel.toString() : null;
  }

  async function callRewriteAPI(text: string, instruction: string) {
    try {
      const auth = JSON.parse(localStorage.getItem("authUser") || "{}");
      const token = auth?.token;

      const res = await fetch("http://localhost:5050/api/coverletter/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, instruction }),
      });

      if (!res.ok) return null;
      return (await res.json()).rewritten;
    } catch {
      return null;
    }
  }

  async function rewriteSelection2() {
    const selected = getSelectedText();
    if (!selected) {
      alert("Select text first!");
      return;
    }

    const rewritten = await callRewriteAPI(
      selected,
      "rewrite for clarity, professionalism, and impact"
    );

    if (!rewritten) return;

    const newHtml = html.replace(selected, rewritten);
    setHtml(newHtml);
    if (editorRef.current) editorRef.current.innerHTML = newHtml;
  }

  async function improveParagraph2() {
    const rewritten = await callRewriteAPI(
      stripFormatting(html),
      "improve writing quality, structure, and clarity"
    );
    if (!rewritten) return;

    setHtml(rewritten);
    if (editorRef.current) editorRef.current.innerHTML = rewritten;
  }

  async function suggestImprovements2() {
    const suggestions = await callRewriteAPI(
      stripFormatting(html),
      "list specific improvements as bullet points"
    );
    if (!suggestions) return;

    const tips = suggestions
      .split(/\n|-/)
      .map((t: string) => t.trim())
      .filter(Boolean);

    setImprovementTips(tips);
  }

  /* ----------------------------------
        UI
  -----------------------------------*/
  return (
    <div className="space-y-4">
      {/* Editable Area */}
      <div
        ref={editorRef}
        className="border rounded-lg p-3 min-h-[250px] bg-white text-sm"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
      ></div>

      {/* Word Count */}
      <div className="text-center text-xs text-gray-500">
        Words: {stripFormatting(html).split(/\s+/).filter(Boolean).length} — Characters: {html.length}
      </div>

      {/* Readability */}
      <div className="text-xs text-gray-700">
        <b>Readability:</b>{" "}
        <span
          className={
            readability.category === "easy"
              ? "text-green-600"
              : readability.category === "medium"
              ? "text-yellow-600"
              : "text-red-600"
          }
        >
          {readability.score.toFixed(1)} / 100 ({readability.category})
        </span>
      </div>

      {/* AI Buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={rewriteSelection2}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
        >
          Rewrite Selected
        </button>

        <button
          onClick={improveParagraph2}
          className="px-3 py-1 text-xs bg-purple-600 text-white rounded"
        >
          Improve Paragraph
        </button>

        <button
          onClick={suggestImprovements2}
          className="px-3 py-1 text-xs bg-emerald-600 text-white rounded"
        >
          Suggest Improvements
        </button>
      </div>

      {/* Synonym Panel */}
      {selectedWord && synonyms.length > 0 && (
        <div data-editor-ui className="p-2 bg-gray-100 border rounded text-xs">
          <div className="mb-1 text-gray-500">
            Synonyms for "<b>{selectedWord}</b>":
          </div>
          <div className="flex flex-wrap gap-2">
            {synonyms.map((s, i) => (
              <button
                key={i}
                onClick={() => replaceWord(selectedWord, s)}
                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Tips */}
      {improvementTips && (
        <div data-editor-ui className="p-3 bg-yellow-50 border rounded text-sm">
          <div className="font-semibold mb-2">Suggested Improvements:</div>

          <ul className="list-disc ml-5 space-y-1">
            {improvementTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                improveParagraph2();
                setImprovementTips(null);
              }}
              className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
            >
              Apply Improvements
            </button>

            <button
              onClick={() => setImprovementTips(null)}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-50 p-2 border rounded text-xs">
          <div className="text-gray-500 mb-1">Recent Versions:</div>
          <ul className="ml-4 list-disc">
            {history.map((h, i) => (
              <li key={i}>{h.slice(0, 50)}...</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded">
          Save
        </button>
      </div>
    </div>
  );
}
