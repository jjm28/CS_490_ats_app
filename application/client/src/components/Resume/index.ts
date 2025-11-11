import React from "react";

/** ===== Types ===== */
export type ResumeStyle = {
  color?: { primary?: string; text?: string; link?: string };
  font?: { family?: "Inter" | "Serif"; sizeScale?: "S" | "M" | "L"; lineHeight?: number };
  layout?: { columns?: 1 | 2 };
  sections?: string[]; // optional future use
};

export type ResumeData = {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{ company: string; role: string; start: string; end: string; bullets?: string[] }>;
  education?: Array<{ school: string; degree: string; years?: string }>;
  skills?: string[];
  projects?: Array<{ name: string; link?: string; summary?: string; bullets?: string[] }>;
  style?: ResumeStyle;
  meta?: { tags?: string; [k: string]: any };
};

export type ResumeSectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects";

export type ResumePreviewProps = {
  data: ResumeData;
  onEdit: (section: ResumeSectionKey) => void;
  className?: string;
};

export type ResumeTemplateKey = "chronological" | "functional" | "hybrid";

/* ===== Lazy previews ===== */
const ChronologicalPreview = React.lazy(() => import("./ClientSide/ChronologicalPreview"));
const FunctionalPreview    = React.lazy(() => import("./ClientSide/FunctionalPreview"));
const HybridPreview        = React.lazy(() => import("./ClientSide/HybridPreview"));

/* ===== Lazy PDFs ===== */
const ChronologicalPdf = React.lazy(() => import("./Pdf/ChronologicalPdf"));
const FunctionalPdf    = React.lazy(() => import("./Pdf/FunctionalPdf"));
const HybridPdf        = React.lazy(() => import("./Pdf/HybridPdf"));

/* ===== Registries ===== */
export const resumePreviewRegistry: Record<
  ResumeTemplateKey,
  React.LazyExoticComponent<React.FC<ResumePreviewProps>>
> = {
  chronological: ChronologicalPreview,
  functional: FunctionalPreview,
  hybrid: HybridPreview,
};

export type ResumePdfComponent = React.LazyExoticComponent<React.FC<ResumeData>>;

export const resumePdfRegistry: Record<ResumeTemplateKey, ResumePdfComponent> = {
  chronological: ChronologicalPdf,
  functional: FunctionalPdf,
  hybrid: HybridPdf,
};

export {
  ChronologicalPreview,
  FunctionalPreview,
  HybridPreview,
  ChronologicalPdf,
  FunctionalPdf,
  HybridPdf,
};
