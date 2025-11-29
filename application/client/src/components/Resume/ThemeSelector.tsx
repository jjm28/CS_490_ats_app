// src/components/Resume/ThemeSelector.tsx
import React from "react";
import type { ThemeKey } from "./resumeThemes";

type Props = {
  themeKey: ThemeKey;
  onChange: (key: ThemeKey) => void;
};

export function ThemeSelector({ themeKey, onChange }: Props) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-medium mb-1">Color theme</label>
      <select
        className="border rounded px-2 py-1 text-xs"
        value={themeKey}
        onChange={(e) => onChange(e.target.value as ThemeKey)}
      >
        <option value="classic">Classic (black/gray)</option>
        <option value="modern">Modern Blue</option>
        <option value="midnight">Midnight</option>
      </select>
    </div>
  );
}
