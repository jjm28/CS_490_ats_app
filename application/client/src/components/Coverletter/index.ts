import React from "react";
import type { PreviewProps } from "./Coverletterstore";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";

// Lazy imports for code-splitting
const FormalPreview = React.lazy(() => import("./CoverLetterTemplates/ClientSide/FormalPreview"));
const CreativePreview = React.lazy(() => import("./CoverLetterTemplates/ClientSide/CreativePreview"));
const TechnicalPreview = React.lazy(() => import("./CoverLetterTemplates/ClientSide/TechnicalPreview"));


const FormalPDF = React.lazy(() => import("./CoverLetterTemplates/Pdf/Formalpdf.tsx")); 
const CreativePDF = React.lazy(() => import("./CoverLetterTemplates/Pdf/Creativepdf.tsx")); 
const TechnicalPDF = React.lazy(() => import("./CoverLetterTemplates/Pdf/Techincalpdf.tsx"));

// Map whatever “criteria” you like => component
export const previewRegistry: Record<string, React.LazyExoticComponent<React.FC<PreviewProps>>> = {
  formal: FormalPreview,
  creative: CreativePreview,
  technical: TechnicalPreview
  // add: technical, academic, etc.
};


export type PdfComponent = React.LazyExoticComponent<React.FC<CoverLetterData>>;
export const pdfRegistry: Record<string, PdfComponent> = {
  formal: FormalPDF,
  creative: CreativePDF, // point to same for now
  technical: TechnicalPDF,
};