import React from "react";
import type { ResumePreviewProps } from "..";

export default function ChronologicalPreview({ data, onEdit, className }: ResumePreviewProps) {
  const primary = data.style?.color?.primary ?? "#111827";
  const fontFamily = data.style?.font?.family === "Serif" ? "ui-serif, Georgia, serif" : "Inter, ui-sans-serif, system-ui, Arial";
  const sizeScale = data.style?.font?.sizeScale ?? "M";
  const baseText = sizeScale === "S" ? "text-[13px]" : sizeScale === "L" ? "text-[15px]" : "text-[14px]";

  return (
    <div className={["w-full max-w-[800px] mx-auto bg-white shadow p-8 rounded leading-relaxed", baseText, className ?? ""].join(" ")} style={{ fontFamily }}>
      <div className="group cursor-pointer mb-6" onClick={() => onEdit("header")}>
        <h1 className="text-2xl font-bold" style={{ color: primary }}>{data.name}</h1>
        <p className="text-sm text-gray-600">{[data.title, data.location].filter(Boolean).join(" • ")}</p>
        <p className="text-sm text-gray-600">{[data.email, data.phone].filter(Boolean).join(" • ")}</p>
      </div>

      {data.summary && (
        <div className="group cursor-pointer mb-6" onClick={() => onEdit("summary")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Summary</h2>
          <p>{data.summary}</p>
        </div>
      )}

      {!!data.experience?.length && (
        <div className="group cursor-pointer mb-6" onClick={() => onEdit("experience")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Experience</h2>
          <div className="space-y-4">
            {[...data.experience].slice().reverse().map((job, i) => (
              <div key={i}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{job.role}</span>
                  <span className="text-gray-600">• {job.company}</span>
                  <span className="ml-auto text-xs text-gray-500">{job.start} – {job.end}</span>
                </div>
                {!!job.bullets?.length && (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {job.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!data.education?.length && (
        <div className="group cursor-pointer mb-6" onClick={() => onEdit("education")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} className="mb-2">
              <div className="font-semibold">{ed.school}</div>
              <div className="text-sm text-gray-700">{ed.degree}</div>
              {ed.years && <div className="text-xs text-gray-500">{ed.years}</div>}
            </div>
          ))}
        </div>
      )}

      {!!data.skills?.length && (
        <div className="group cursor-pointer" onClick={() => onEdit("skills")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Skills</h2>
          <p>{data.skills.join(" • ")}</p>
        </div>
      )}
    </div>
  );
}
