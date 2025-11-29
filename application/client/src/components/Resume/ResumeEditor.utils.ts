import type React from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { pdf } from "@react-pdf/renderer";
import type { ResumeData, TemplateKey, ContactInfo } from "../../api/resumes";
import {getProfileContact} from "../../api/resumes";
import {BRANDING_WATERMARK} from "./ResumeEditor.types";
import type {ValidationIssue, ValidationSummary, ExportFormat} from "./ResumeEditor.types"

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "/api";

/* ---------- Base defaults ---------- */

export function createBaseResumeDefaults(): ResumeData {
  let name = "Your Name";
  const contact: ContactInfo = {};

  try {
    const user = safeGetUser(); // re-use existing helper
    const profile = (user as any).profile || user;

    // Try a few likely field names
    const fullName =
      profile.fullName ||
      profile.name ||
      profile.displayName ||
      `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

    if (fullName) {
      name = fullName;
    }

    if (profile.email) {
      contact.email = profile.email;
    }
    if (profile.phone) {
      contact.phone = profile.phone;
    }
  } catch (err) {
    // Not logged in or authUser malformed – just keep defaults
    console.warn("Could not prefill resume from authUser", err);
  }

  return {
    name,
    contact,
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
  };
}

export async function loadContactFromProfile(
  setLocal: (c: ContactInfo, profileName?: string) => void,
  existing: ContactInfo | undefined
): Promise<void> {
  try {
    const { name, contact } = await getProfileContact();

    console.log("getProfileContact result:", { name, contact });

    const merged: ContactInfo = {
      email: contact.email ?? existing?.email,
      phone: contact.phone ?? existing?.phone,
      location: contact.location ?? existing?.location,
      website: contact.website ?? existing?.website,
      linkedin: contact.linkedin ?? existing?.linkedin,
      github: contact.github ?? existing?.github,
    };

    console.log("Merged contact for resume:", merged);

    setLocal(merged, name);
  } catch (err) {
    console.error("loadContactFromProfile error", err);
    alert(
      "Could not load contact info from profile. You can still enter it manually."
    );
  }
}

/* ---------- Text collection + validation ---------- */

function collectTextFromResume(data: ResumeData): string {
  const chunks: string[] = [];

  if (data.name) chunks.push(String(data.name));
  if (data.summary) chunks.push(String(data.summary));

  (data.experience || []).forEach((exp: any) => {
    if (exp.company) chunks.push(String(exp.company));
    if (exp.jobTitle) chunks.push(String(exp.jobTitle));
    if (exp.location) chunks.push(String(exp.location));
    if (Array.isArray(exp.highlights)) {
      chunks.push(exp.highlights.join(" "));
    }
  });

  (data.education || []).forEach((ed: any) => {
    if (ed.institution) chunks.push(String(ed.institution));
    if (ed.degree) chunks.push(String(ed.degree));
    if (ed.fieldOfStudy) chunks.push(String(ed.fieldOfStudy));
  });

  (data.projects || []).forEach((p: any) => {
    if (p.name) chunks.push(String(p.name));
    if (p.technologies) chunks.push(String(p.technologies));
    if (p.outcomes) chunks.push(String(p.outcomes));
  });

  (data.skills || []).forEach((s: any) => {
    const name = typeof s === "string" ? s : s?.name;
    if (name) chunks.push(String(name));
  });

  return chunks.filter(Boolean).join(" ");
}

export function runResumeValidation(data: ResumeData): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const text = collectTextFromResume(data);
  const trimmed = text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const estimatedPages = Math.max(1, Math.round(wordCount / 500)); // ~500 words/page

  // Length
  if (estimatedPages > 2) {
    issues.push({
      type: "length",
      severity: "warning",
      message:
        "Resume may be too long. Aim for 1–2 pages by tightening bullets and removing older or less relevant roles.",
    });
  } else if (wordCount < 200) {
    issues.push({
      type: "length",
      severity: "info",
      message:
        "Resume looks very short. Consider adding more detail on impact, metrics, and relevant experience.",
    });
  }

  // Missing info
  if (!data.summary || !String(data.summary).trim()) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "summary",
      message:
        "Summary is empty. Add a 2–3 sentence summary emphasizing your role, focus, and key strengths.",
    });
  }

  if (!data.experience || data.experience.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "experience",
      message:
        "No experience entries. Add internships, projects, or roles to show your impact.",
    });
  } else {
    (data.experience || []).forEach((exp: any, idx: number) => {
      if (!exp.company || !exp.jobTitle || !exp.startDate) {
        issues.push({
          type: "missing-info",
          severity: "warning",
          field: `experience[${idx}]`,
          message:
            "Each experience should have a company, job title, and start date. Some entries are incomplete.",
        });
      }
      if (!exp.highlights || exp.highlights.length === 0) {
        issues.push({
          type: "missing-info",
          severity: "info",
          field: `experience[${idx}].highlights`,
          message:
            "Add 2–5 bullet points for each experience to describe your impact.",
        });
      }
    });
  }

  if (!data.education || data.education.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "education",
      message:
        "No education entries. Add your degree, institution, and expected graduation date.",
    });
  }

  if (!data.skills || data.skills.length === 0) {
    issues.push({
      type: "missing-info",
      severity: "warning",
      field: "skills",
      message:
        "No skills listed. Add your core technical and relevant tools (e.g., React, Node, SQL).",
    });
  }

  // Date format
  const dateRegex = /^\d{4}-\d{2}/; // YYYY-MM
  const checkDate = (value: string | null | undefined, field: string) => {
    if (!value) return;
    if (!dateRegex.test(value)) {
      issues.push({
        type: "format",
        severity: "info",
        field,
        message: `Date "${value}" is not in a consistent YYYY-MM format. Use a single format across the resume.`,
      });
    }
  };

  (data.experience || []).forEach((exp: any, idx: number) => {
    checkDate(exp.startDate, `experience[${idx}].startDate`);
    if (exp.endDate) checkDate(exp.endDate, `experience[${idx}].endDate`);
  });
  (data.education || []).forEach((ed: any, idx: number) => {
    checkDate(ed.graduationDate, `education[${idx}].graduationDate`);
  });

  // Contact validation
  const anyData: any = data as any;
  const email: string | undefined =
    anyData.email || anyData.contact?.email || anyData.header?.email;
  const phone: string | undefined =
    anyData.phone || anyData.contact?.phone || anyData.header?.phone;
  const location: string | undefined =
    anyData.location || anyData.contact?.location || anyData.header?.location;

  let contactOk = true;
  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /^[0-9+()\-.\s]{7,}$/;

  if (!email && !phone && !location) {
    contactOk = false;
    issues.push({
      type: "contact",
      severity: "error",
      message:
        "No contact information detected. Include at least email and phone so recruiters can reach you.",
    });
  } else {
    if (email && !emailRegex.test(email)) {
      contactOk = false;
      issues.push({
        type: "contact",
        severity: "warning",
        field: "email",
        message:
          "Email format looks unusual. Make sure it’s a valid address (e.g., yourname@domain.com).",
      });
    }
    if (phone && !phoneRegex.test(phone)) {
      contactOk = false;
      issues.push({
        type: "contact",
        severity: "info",
        field: "phone",
        message:
          "Phone number may be missing country code or separators. Ensure it’s easy to dial internationally.",
      });
    }
  }

  // Tone / simple grammar-ish checks
  const lower = trimmed.toLowerCase();
  const slangWords = ["lol", "lmao", "omg", "bro", "dude", "hella", "kinda", "sorta"];
  let slangHits = 0;

  slangWords.forEach((w) => {
    if (
      lower.includes(` ${w} `) ||
      lower.startsWith(`${w} `) ||
      lower.endsWith(` ${w}`)
    ) {
      slangHits++;
      issues.push({
        type: "tone",
        severity: "warning",
        message: `Informal word "${w}" detected. Replace slang with professional language.`,
      });
    }
  });

  if (/[!?]{2,}/.test(trimmed)) {
    issues.push({
      type: "tone",
      severity: "info",
      message:
        "Multiple exclamation/question marks found. Keep punctuation neutral and professional.",
    });
  }

  if (/\bi\b(?![a-zA-Z])/g.test(trimmed)) {
    issues.push({
      type: "spell-grammar",
      severity: "info",
      message: 'First-person "I" should be capitalized if you choose to use it.',
    });
  }

  if (/\s{2,}/.test(trimmed)) {
    issues.push({
      type: "format",
      severity: "info",
      message: "Double spaces detected. Clean up extra spaces for a polished look.",
    });
  }

  let tone: "professional" | "mixed" | "informal" = "professional";
  if (slangHits > 1 || /[!?]{2,}/.test(trimmed)) tone = "informal";
  else if (slangHits === 1) tone = "mixed";

  const hasMissingInfo = issues.some((i) => i.type === "missing-info");

  if (!trimmed) {
    issues.push({
      type: "missing-info",
      severity: "error",
      message: "Resume content is empty. Add sections before exporting.",
    });
  }

  return {
    issues,
    wordCount,
    estimatedPages,
    tone,
    contactOk,
    hasMissingInfo,
  };
}

/* ---------- Export helpers ---------- */

function slugify(input: string) {
  return (
    (input || "resume")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "resume"
  );
}

export function buildBaseFilename(
  resumeName: string | undefined,
  templateKey: TemplateKey
) {
  const namePart = slugify(resumeName || "resume");
  const templatePart = slugify(templateKey);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${namePart}_${templatePart}_${ts}`;
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildPlainTextResume(data: ResumeData): string {
  const contact: any = (data as any).contact || {};
  const parts: string[] = [];

  parts.push(data.name || "Your Name");
  if (contact.email || contact.phone || contact.location) {
    const line = [contact.email, contact.phone, contact.location]
      .filter(Boolean)
      .join(" | ");
    if (line) parts.push(line);
  }
  parts.push("");

  if (data.summary) {
    parts.push("SUMMARY");
    parts.push(String(data.summary), "");
  }

  if (Array.isArray(data.skills) && data.skills.length) {
    const skills = data.skills
      .map((s: any) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean)
      .join(", ");
    if (skills) {
      parts.push("SKILLS");
      parts.push(skills, "");
    }
  }

  if (Array.isArray(data.experience) && data.experience.length) {
    parts.push("EXPERIENCE");
    for (const e of data.experience as any[]) {
      const header = [
        e.jobTitle,
        e.company,
        [e.startDate, e.endDate || "Present"].filter(Boolean).join(" – "),
        e.location,
      ]
        .filter(Boolean)
        .join(" | ");
      if (header) parts.push(header);
      if (Array.isArray(e.highlights)) {
        for (const h of e.highlights) {
          parts.push(`• ${String(h)}`);
        }
      }
      parts.push("");
    }
  }

  if (Array.isArray(data.education) && data.education.length) {
    parts.push("EDUCATION");
    for (const ed of data.education as any[]) {
      const line1 = [ed.degree, ed.fieldOfStudy].filter(Boolean).join(", ");
      const line2 = [ed.institution, ed.graduationDate]
        .filter(Boolean)
        .join(" • ");
      if (line1) parts.push(line1);
      if (line2) parts.push(line2);
      parts.push("");
    }
  }

  if (Array.isArray(data.projects) && data.projects.length) {
    parts.push("PROJECTS");
    for (const p of data.projects as any[]) {
      const header = [p.name, p.technologies].filter(Boolean).join(" — ");
      if (header) parts.push(header);
      if (p.outcomes) parts.push(String(p.outcomes));
      parts.push("");
    }
  }

  parts.push(`\n${BRANDING_WATERMARK}`);
  return parts.join("\n");
}

export function buildHtmlResume(
  data: ResumeData,
  templateKey: TemplateKey,
  theme: "standard" | "minimal" = "standard"
): string {
  const plain = buildPlainTextResume(data);
  const bodyHtml = plain
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "<br/>";
      if (/^(SUMMARY|SKILLS|EXPERIENCE|EDUCATION|PROJECTS)$/.test(line.trim()))
        return `<h2>${line.trim()}</h2>`;
      if (line.startsWith("•")) return `<li>${line.slice(1).trim()}</li>`;
      return `<p>${line}</p>`;
    })
    .join("\n");

  const fontFamily =
    theme === "minimal" ? "system-ui, -apple-system" : "Segoe UI, sans-serif";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${data.name || "Resume"} — ${templateKey}</title>
</head>
<body style="font-family:${fontFamily}; line-height:1.4; max-width:800px; margin:40px auto; padding:0 24px;">
  ${bodyHtml}
  <hr style="margin-top:32px; border:none; border-top:1px solid #ddd;" />
  <div style="font-size:11px; color:#888; text-align:right;">
    ${BRANDING_WATERMARK}
  </div>
</body>
</html>`;
}

export async function exportDocxResume(
  data: ResumeData,
  templateKey: TemplateKey,
  filenameBase: string
) {
  const contact: any = (data as any).contact || {};
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: data.name || "Your Name",
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  [contact.email, contact.phone, contact.location]
                    .filter(Boolean)
                    .join(" | ") || "",
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          data.summary
            ? new Paragraph({
                children: [
                  new TextRun({ text: "Summary", bold: true, break: 1 }),
                  new TextRun({ text: `\n${String(data.summary)}` }),
                ],
              })
            : new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "\n\n" + BRANDING_WATERMARK, size: 16 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filenameBase}.docx`);
}

export async function exportResume(params: {
  format: ExportFormat;
  filename: string;
  templateKey: TemplateKey;
  data: ResumeData;
  lastSaved: string | null;
  pdfDoc: React.ReactElement;
  onError?: (msg: string) => void;
}) {
  const { format, filename, templateKey, data, lastSaved, pdfDoc, onError } =
    params;

  try {
    const base = buildBaseFilename(filename, templateKey);

    if (format === "json") {
      const payload = {
        filename,
        templateKey,
        resumedata: { ...data },
        lastSaved,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      triggerDownload(blob, `${base}.json`);
      return;
    }

    if (format === "txt") {
      const txt = buildPlainTextResume(data);
      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      triggerDownload(blob, `${base}.txt`);
      return;
    }

    if (format === "html") {
      const html = buildHtmlResume(data, templateKey, "standard");
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      triggerDownload(blob, `${base}.html`);
      return;
    }

    if (format === "docx") {
      await exportDocxResume(data, templateKey, base);
      return;
    }

    if (format === "pdf") {
      const instance = pdf(pdfDoc as any);
      const blob = await instance.toBlob();
      triggerDownload(blob, `${base}.pdf`);
      return;
    }
  } catch (e: any) {
    console.error("Export failed:", e);
    if (onError) onError(e?.message ?? "Export failed.");
  }
}

/* ---------- Skills helpers ---------- */

export function skillNamesToObjects(
  input: string
): Array<{ name: string; label?: string; groupName?: string }> {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      label: name,
      groupName: name,
    }));
}

// helper to load skills
export function normalizeSkillsForPreview(skills: any): any[] {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((s) => {
      if (!s) return null;

      // If it's just a plain string, wrap it
      if (typeof s === "string") {
        const name = s.trim();
        if (!name) return null;
        return { name, label: name, groupName: name };
      }

      // If it's already an object, make sure the name/groupName/label are set
      const raw: any = s;
      const name =
        raw.name || raw.groupName || raw.label || String(raw) || "Skill";

      return {
        ...raw,
        name,
        label: raw.label ?? name,
        groupName: raw.groupName ?? name,
      };
    })
    .filter(Boolean);
}

export function skillsCsv(data: ResumeData): string {
  return Array.isArray(data.skills)
    ? data.skills
        .map((s: any) => (typeof s === "string" ? s : s?.name))
        .filter(Boolean)
        .join(", ")
    : "";
}

/* ---------- Auth + contact loader ---------- */

export function safeGetUser() {
  const raw = localStorage.getItem("authUser");
  if (!raw) throw new Error("Not signed in (authUser missing).");
  const parsed = JSON.parse(raw);
  const u = parsed.user || parsed;
  if (!u?._id) throw new Error("authUser is missing _id.");
  return u;
}



