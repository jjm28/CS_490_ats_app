import React from "react";
import type { ResumePreviewProps } from "..";

function toNameList(arr: any): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((x) => (typeof x === "string" ? x : x?.name))
    .filter(Boolean)
    .join(", ");
}

export default function ChronologicalPreview({ data, onEdit, className }: ResumePreviewProps) {
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const edu = Array.isArray(data.education) ? data.education : [];
  const skills = toNameList(data.skills);

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

      {exp.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-600">Experience</h3>
          <ul className="mt-1 space-y-1">
            {exp.map((e: any, i: number) => (
              <li key={i} className="text-sm">
                <div className="font-medium">
                  {(e?.jobTitle || "Title")} • {(e?.company || "Company")}
                </div>
                <div className="text-xs text-gray-500">
                  {(e?.startDate || "")} – {(e?.endDate || "Present")}
                  {e?.location ? ` • ${e.location}` : ""}
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

      {edu.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-600">Education</h3>
          <ul className="mt-1 space-y-1">
            {edu.map((ed: any, i: number) => (
              <li key={i} className="text-sm">
                <div className="font-medium">
                  {(ed?.degree || "Degree")}{ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                </div>
                <div className="text-xs text-gray-500">
                  {(ed?.institution || "School")}
                  {ed?.graduationDate ? ` • ${ed.graduationDate}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skills && (
        <section>
          <h3 className="text-sm font-semibold uppercase text-gray-600">Skills</h3>
          <p className="text-sm mt-1">{skills}</p>
        </section>
      )}
    </div>
  );
}
