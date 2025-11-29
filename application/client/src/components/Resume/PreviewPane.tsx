// src/components/Resume/PreviewPane.tsx
import React, { Suspense } from "react";
import type { ResumeData } from "../../api/resumes";
import type { ThemeKey, ResumeTheme } from "./resumeThemes";
import { ThemeSelector } from "./ThemeSelector";

type Props = {
  Preview: React.ComponentType<any>;
  data: ResumeData;
  themeKey: ThemeKey;
  onThemeChange: (key: ThemeKey) => void;
  theme: ResumeTheme;
  visibleSections: string[];
  sectionOrder: string[];
  onEdit: (section: string) => void;
};

export function PreviewPane({
  Preview,
  data,
  themeKey,
  onThemeChange,
  theme,
  visibleSections,
  sectionOrder,
  onEdit,
}: Props) {
  return (
    <div className="space-y-3">
      <ThemeSelector themeKey={themeKey} onChange={onThemeChange} />

      <div className="border rounded p-3 bg-stone-50">
        <Suspense fallback={<div className="text-sm text-gray-500 p-6">Loading preview…</div>}>
          <Preview
            data={data}
            onEdit={onEdit}
            visibleSections={visibleSections}
            sectionOrder={sectionOrder}
            theme={theme}
          />
        </Suspense>
      </div>
    </div>
  );
}
