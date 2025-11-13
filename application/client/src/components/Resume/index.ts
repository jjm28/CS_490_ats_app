// src/components/Resume/index.ts
import React from "react";
import type { ResumeData, TemplateKey } from "../../api/resumes";

/* -------- Web previews (DOM) -------- */
const ChronologicalPreview = React.lazy(() => import("./ClientSide/ChronologicalPreview"));
const FunctionalPreview    = React.lazy(() => import("./ClientSide/FunctionalPreview"));
const HybridPreview        = React.lazy(() => import("./ClientSide/HybridPreview"));

export type ResumePreviewProps = {
  data: ResumeData;
  onEdit: (section: string) => void;
  className?: string;
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
const ChronologicalPdf = React.lazy(() => import("./Pdf/ChronologicalPdf"));
const FunctionalPdf    = React.lazy(() => import("./Pdf/FunctionalPdf"));
const HybridPdf        = React.lazy(() => import("./Pdf/HybridPdf"));

export type ResumeDocProps = { data: ResumeData };

export const resumePdfRegistry: Record<
  TemplateKey,
  React.LazyExoticComponent<React.FC<ResumeDocProps>>
> = {
  chronological: ChronologicalPdf,
  functional:    FunctionalPdf,
  hybrid:        HybridPdf,
};
