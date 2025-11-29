// src/components/Resume/resumeThemes.ts
import type { TemplateKey } from "../../api/resumes";

export type ResumeTheme = {
  primary: string;
  text: string;
  muted: string;
  bg: string;
  border: string;
  label?: string;
};

export type ThemeKey = "classic" | "modern" | "midnight";

// default theme per template key
export const TEMPLATE_DEFAULT_THEME: Record<TemplateKey, ThemeKey> = {
  chronological: "classic",
  functional: "modern",
  hybrid: "midnight",
};

export const THEMES: Record<ThemeKey, ResumeTheme> = {
  classic: {
    primary: "#111827",
    text: "#111827",
    muted: "#4b5563",
    bg: "#ffffff",
    border: "#e5e7eb",
  },
  modern: {
    primary: "#2563eb",
    text: "#0f172a",
    muted: "#64748b",
    bg: "#ffffff",
    border: "#bfdbfe",
  },
  midnight: {
    primary: "#38bdf8",
    text: "#e5e7eb",
    muted: "#9ca3af",
    bg: "#020617",
    border: "#1e293b",
  },
};
