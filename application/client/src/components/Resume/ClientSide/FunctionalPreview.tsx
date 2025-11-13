import React from "react";
import type { ResumePreviewProps } from "..";

function toNameList(arr: any): string {
  if (!Array.isArray(arr)) return "";
  return arr.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean).join(", ");
}

export default function FunctionalPreview({ data, onEdit, className }: ResumePreviewProps) {
  const skills = toNameList(data.skills);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const exp = Array.isArray(data.experience) ? data.experience : [];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{data.name || "Your Name"}</h2>
        <button onClick={() => onEdit("header")} className="text-xs underline">Edit name</button>
      </div>

      {data.summary ? (
        <p className="text-sm text-gray-700 mb-4">{String(data.summary)}</p>
      ) : (
        <button onClick={() => onEdit("summary")} className="text-xs underline mb-4">Add summary</button>
      )}

      {skills && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-600">Core Skills</h3>
          <p className="text-sm mt-1">{skills}</p>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-600">Selected Projects</h3>
          <ul className="mt-1 space-y-1">
            {projects.slice(0, 3).map((p: any, i: number) => (
              <li key={i} className="text-sm">
                <div className="font-medium">{p?.name ? String(p.name) : "Project"}</div>
                {p?.technologies && <div className="text-xs text-gray-500">{String(p.technologies)}</div>}
                {p?.outcomes && <div className="text-xs">{String(p.outcomes)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {exp.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase text-gray-600">Experience Highlights</h3>
          <ul className="mt-1 space-y-1">
            {exp.slice(0, 2).map((e: any, i: number) => (
              <li key={i} className="text-sm">
                <div className="font-medium">
                  {(e?.jobTitle || "Title")} • {(e?.company || "Company")}
                </div>
                {Array.isArray(e?.highlights) &&
                  e.highlights.slice(0, 2).map((h: any, j: number) => (
                    <div key={j} className="text-xs">• {String(h)}</div>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
