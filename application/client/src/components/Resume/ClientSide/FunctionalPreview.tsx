import React from "react";
import type { ResumePreviewProps } from "..";

export default function FunctionalPreview({ data, onEdit, className }: ResumePreviewProps) {
  const primary = data.style?.color?.primary ?? "#111827";
  const fontFamily = data.style?.font?.family === "Serif" ? "ui-serif, Georgia, serif" : "Inter, ui-sans-serif, system-ui, Arial";
  const sizeScale = data.style?.font?.sizeScale ?? "M";
  const baseText = sizeScale === "S" ? "text-[13px]" : sizeScale === "L" ? "text-[15px]" : "text-[14px]";

  return (
    <div className={["w-full max-w-[800px] mx-auto bg-white shadow p-8 rounded leading-relaxed", baseText, className ?? ""].join(" ")} style={{ fontFamily }}>
      <div className="group cursor-pointer mb-6" onClick={() => onEdit("header")}>
        <h1 className="text-2xl font-extrabold" style={{ color: primary }}>{data.name}</h1>
        <p className="text-sm text-gray-600">{[data.title, data.location].filter(Boolean).join(" • ")}</p>
        <p className="text-sm text-gray-600">{[data.email, data.phone].filter(Boolean).join(" • ")}</p>
      </div>

      {data.summary && (
        <div className="group cursor-pointer mb-8" onClick={() => onEdit("summary")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Profile</h2>
          <p>{data.summary}</p>
        </div>
      )}

      {!!data.skills?.length && (
        <div className="group cursor-pointer mb-8" onClick={() => onEdit("skills")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Core Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}

      {!!data.projects?.length && (
        <div className="group cursor-pointer mb-8" onClick={() => onEdit("projects")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Selected Projects</h2>
          <div className="space-y-3">
            {data.projects.map((p, i) => (
              <div key={i}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 break-all">{p.link}</a>}
                </div>
                {p.summary && <p className="text-sm">{p.summary}</p>}
                {!!p.bullets?.length && (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {p.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!data.experience?.length && (
        <div className="group cursor-pointer" onClick={() => onEdit("experience")}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>Experience</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.experience.map((job, i) => (
              <div key={i} className="border rounded p-3">
                <div className="font-semibold">{job.role}</div>
                <div className="text-sm text-gray-700">{job.company}</div>
                <div className="text-xs text-gray-500">{job.start} – {job.end}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
