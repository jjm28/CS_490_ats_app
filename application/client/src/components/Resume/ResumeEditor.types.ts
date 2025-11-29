import type { ResumeData, TemplateKey, ContactInfo } from "../../api/resumes";

export const BRANDING_WATERMARK = "Generated with ATS Resume Builder";

/* ---------- AI types / location state ---------- */

export type AiResumeCandidate = {
  summarySuggestions?: string[];
  skills?: string[];
  atsKeywords?: string[];
  experienceBullets?: Array<{
    sourceExperienceIndex: number;
    company: string;
    jobTitle: string;
    bullets: string[];
    startDate?: string;
    endDate?: string;
    location?: string;
  }>;
};

export type LocationState = {
  ResumeId?: string | null;
  template: { key: TemplateKey; title?: string };
  resumeData?: {
    filename: string;
    templateKey: TemplateKey;
    resumedata: ResumeData;
    lastSaved: string | null;
  };
  AImode?: boolean;
  AiResume?: {
    parsedCandidates?: AiResumeCandidate[];
    data?: AiResumeCandidate;
  };
};

/* ---------- Sections / versions ---------- */

export type SectionKey =
  | "header"
  | "contact"
  | "summary"
  | "skills:add"
  | "experience:add"
  | "experience:edit"
  | "education:add"
  | "education:edit"
  | "project:add"
  | "project:edit";

export type AnyIndex = { idx: number } | null;

export type ResumeVersionLite = {
  _id: string;
  name: string;
  createdAt?: string;
  isDefault?: boolean;
};

export type SectionId =
  | "header"
  | "contact"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects";

export type SectionConfig = {
  id: SectionId;
  label: string;
  enabled: boolean;
};

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "header", label: "Header", enabled: true },
  { id: "contact", label: "Contact", enabled: true },
  { id: "summary", label: "Summary", enabled: true },
  { id: "skills", label: "Skills", enabled: true },
  { id: "experience", label: "Experience", enabled: true },
  { id: "education", label: "Education", enabled: true },
  { id: "projects", label: "Projects", enabled: true },
];

/* ---------- Validation ---------- */

export type ValidationIssueType =
  | "missing-info"
  | "length"
  | "format"
  | "contact"
  | "tone"
  | "spell-grammar";

export type ValidationSeverity = "info" | "warning" | "error";

export type ValidationIssue = {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  message: string;
  field?: string;
};

export type ValidationSummary = {
  issues: ValidationIssue[];
  wordCount: number;
  estimatedPages: number;
  tone: "professional" | "mixed" | "informal";
  contactOk: boolean;
  hasMissingInfo: boolean;
};

/* ---------- Export ---------- */

export type ExportFormat = "json" | "pdf" | "docx" | "txt" | "html";
