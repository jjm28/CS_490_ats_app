// src/components/Resume/index.ts
import React from "react";
import type { ResumeData, TemplateKey } from "../../api/resumes";
import type { ResumeTheme } from "./resumeThemes";

/* -------- Web previews (DOM) -------- */
const ChronologicalPreview = React.lazy(() => import("./ClientSide/ChronologicalPreview"));
const FunctionalPreview    = React.lazy(() => import("./ClientSide/FunctionalPreview"));
const HybridPreview        = React.lazy(() => import("./ClientSide/HybridPreview"));

export type SectionId =
  | "header"
  | "contact"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects";

export type ResumePreviewProps = {
  data: ResumeData;
  onEdit: (section: SectionId | string) => void;
  className?: string;
  visibleSections?: SectionId[];
  sectionOrder?: SectionId[];
  theme?: ResumeTheme;
};

export const resumePreviewRegistry: Record<
  TemplateKey,
  React.LazyExoticComponent<React.FC<ResumePreviewProps>>
> = {
  chronological: ChronologicalPreview,
  functional:    FunctionalPreview,
  hybrid:        HybridPreview,
};

/* -------- PDF components (React-PDF) -------- */
import ChronologicalPdf from "./Pdf/ChronologicalPdf";
import FunctionalPdf from "./Pdf/FunctionalPdf";
import HybridPdf from "./Pdf/HybridPdf";

export type ResumeDocProps = {
  data: ResumeData;
  visibleSections?: SectionId[];
};

export const resumePdfRegistry: Record<
  TemplateKey,
  React.FC<ResumeDocProps>
> = {
  chronological: ChronologicalPdf,
  functional: FunctionalPdf,
  hybrid: HybridPdf,
};