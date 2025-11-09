import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { getResume, updateResume, deleteResume } from "../../api/resumes";
import "../../styles/StyledComponents/FormInput.css";
import "../../styles/resumeDoc.css";


function EditableDiv({
  html,
  onChange,
  placeholder,
  className,
  disabled,
  onFocus,
}: {
  html?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onFocus?: (el: HTMLDivElement) => void;
}) {
  const [initial] = useState(html || "");

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const next = (e.target as HTMLDivElement).innerHTML;
    onChange?.(next);
  }

  return (
    <div
      className={`${className || ""} editable ${disabled ? "is-preview" : ""}`}
      contentEditable={!disabled}
      data-placeholder={placeholder || ""}
      suppressContentEditableWarning
      onInput={disabled ? undefined : handleInput}
      onFocus={(e) => onFocus?.(e.currentTarget)}          
      dir="ltr"
      dangerouslySetInnerHTML={{ __html: initial }}
    />
  );
}

type ResumeDoc = {
  _id: string;
  name: string;
  templateId?: string;
  content: {
    title?: string;
    contact?: string;
    layout?: { sections?: string[] };
    sections?: Record<string, { html?: string }>;
  };
};

function focusThen(fn: () => void, el?: HTMLElement | null) {
  if (el) el.focus();
  fn();
}

// Some browsers want `<h1>` vs `h1`
function formatBlock(tag: "p" | "h1" | "h2") {
  const val = tag === "p" ? "p" : tag;
  document.execCommand("formatBlock", false, val.startsWith("<") ? val : `<${val}>`);
}

function Toolbar({
  target,            // current focused editable element
  disabled,
  onBlockChange,     // optional: notify block changes if you care
}: {
  target?: HTMLElement | null;
  disabled?: boolean;
  onBlockChange?: (tag: "p" | "h1" | "h2") => void;
}) {
  return (
    <div className={`r-toolbar ${disabled ? "is-disabled" : ""}`}>
      <button
        type="button"
        onClick={() => focusThen(() => document.execCommand("bold"), target)}
        disabled={disabled}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => focusThen(() => document.execCommand("italic"), target)}
        disabled={disabled}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => focusThen(() => document.execCommand("underline"), target)}
        disabled={disabled}
        title="Underline"
      >
        U
      </button>

      <span className="r-tool-sep" />

      <button
        type="button"
        onClick={() =>
          focusThen(() => document.execCommand("insertUnorderedList"), target)
        }
        disabled={disabled}
        title="Bulleted list"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() =>
          focusThen(() => document.execCommand("insertOrderedList"), target)
        }
        disabled={disabled}
        title="Numbered list"
      >
        1. List
      </button>

      <span className="r-tool-sep" />

      <select
        className="r-block-select"
        disabled={disabled}
        onChange={(e) => {
          const tag = e.target.value as "p" | "h1" | "h2";
          focusThen(() => formatBlock(tag), target);
          onBlockChange?.(tag);
        }}
        defaultValue="p"
        title="Block style"
      >
        <option value="p">Paragraph</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
      </select>

      <input
        type="color"
        className="r-color"
        title="Text color"
        disabled={disabled}
        onChange={(e) => {
          const color = e.target.value || "#111827";
          focusThen(() => document.execCommand("foreColor", false, color), target);
        }}
      />
    </div>
  );
}



export default function ResumeDocEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDraft = Boolean((location.state as any)?.draft);

  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeEl, setActiveEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getResume(id!);
        // Normalize shape
        setDoc({
          _id: data._id,
          name: data.name,
          templateId: data.templateId,
          content: {
            title: data.content?.title ?? data.name ?? "Untitled",
            contact:
              data.content?.contact ??
              "City, ST • email@example.com • (555) 555-5555 • linkedin.com/in/you",
            layout: data.content?.layout ?? { sections: [] },
            sections: data.content?.sections ?? {},
          },
        });
      } catch (e: any) {
        setErr(e?.message || "Failed to load resume");
      }
    })();
  }, [id]);

  const sections = useMemo<string[]>(
    () => doc?.content?.layout?.sections || [],
    [doc]
  );

  function setTitle(html: string) {
    setDirty(true);
    setDoc((d) => (d ? { ...d, content: { ...d.content, title: html } } : d));
  }

  function setContact(html: string) {
    setDirty(true);
    setDoc((d) =>
      d
        ? {
            ...d,
            content: { ...d.content, contact: html },
          }
        : d
    );
  }

  function setSection(name: string, html: string) {
    setDirty(true);
    setDoc((d) =>
      d
        ? {
            ...d,
            content: {
              ...d.content,
              sections: {
                ...(d.content.sections || {}),
                [name]: { html },
              },
            },
          }
        : d
    );
  }

  async function handleSave() {
    if (!doc) return;
    try {
      setSaving(true);
      setErr(null);
      await updateResume(doc._id, {
        name: doc.name,
        content: doc.content,
      });
      setDirty(false);
      navigate("/resumes", { state: { flash: "Resume saved" } });
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    // If user is editing a just-created draft, delete it on cancel.
    if (isDraft && doc?._id) {
      try {
        await deleteResume(doc._id);
      } catch {
        // ignore
      }
    }
    navigate("/templates", { replace: true });
  }

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!doc) return <div className="p-6">Loading…</div>;

  return (
    <div className="r-root">
      <header className="r-top">
        <h1 className="r-editing-title">
            Editing: <span className="r-editing-name">{doc.name}</span>
            {dirty && <em className="r-dirty">unsaved</em>}
        </h1>
        <div className="r-actions">
            {/*toolbar – disabled in Preview mode */}
            <Toolbar target={activeEl} disabled={preview} />

            <Button variant="secondary" onClick={() => setPreview((p) => !p)}>
            {preview ? "Exit preview" : "Preview"}
            </Button>
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
            </Button>
        </div>
        </header>

      <main className="r-workspace">
        <div className={`r-page ${preview ? "is-preview" : ""}`}>
          {/* Title */}
          <EditableDiv
            className="r-title r-editable"
            placeholder="Your Name"
            html={doc.content.title || ""}
            onChange={setTitle}
            onFocus={setActiveEl}  
            disabled={preview}
          />
          {/* Contact line */}
          <EditableDiv
            className="r-sub r-editable"
            placeholder="City, ST • email@example.com • (555) 555-5555 • linkedin.com/in/you"
            html={doc.content.contact || ""}
            onChange={setContact}
            onFocus={setActiveEl}  
            disabled={preview}
          />

          {/* Sections */}
          <div className="r-sections">
            {sections.length === 0 ? (
              <div className="r-empty-note">This template has no sections.</div>
            ) : (
              sections.map((s) => (
                <section key={s} className="r-section">
                  <div className="r-h">{s}</div>
                  <EditableDiv
                    className="r-editable"
                    placeholder={`Type ${s} here…`}
                    html={doc.content.sections?.[s]?.html || ""}
                    onChange={(html) => setSection(s, html)}
                    onFocus={setActiveEl}  
                    disabled={preview}
                  />
                </section>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
