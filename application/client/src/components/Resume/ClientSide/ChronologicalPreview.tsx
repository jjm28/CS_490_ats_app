// src/components/Resume/ClientSide/ChronologicalPreview.tsx
import React from "react";
import type { ResumePreviewProps, SectionId } from "..";

function toNameList(arr: any): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((x) => (typeof x === "string" ? x : x?.name))
    .filter(Boolean)
    .join(", ");
}

export default function ChronologicalPreview({
  data,
  onEdit,
  className,
  visibleSections,
  sectionOrder,
}: ResumePreviewProps) {
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const edu = Array.isArray(data.education) ? data.education : [];
  const skills = toNameList(data.skills);

  const contactBits = [
    data.contact?.email,
    data.contact?.phone,
    data.contact?.location,
    data.contact?.website,
    data.contact?.linkedin,
    data.contact?.github,
  ].filter(Boolean);
  const contactLine = contactBits.join(" | ");

  // --- visibility + ordering helpers ---

  const isVisible = (id: SectionId) => {
    // If no filter provided, everything is visible
    if (!visibleSections) return true;
    return visibleSections.includes(id);
  };

  const defaultOrder: SectionId[] = [
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
  ];

  const order: SectionId[] = (
    sectionOrder && sectionOrder.length ? sectionOrder : defaultOrder
  ).filter((id: SectionId) => isVisible(id));

  return (
    <div className={className}>
      {/* Header always shows */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{data.name || "Your Name"}</h2>
        <button onClick={() => onEdit("header")} className="text-xs underline">
          Edit name
        </button>
      </div>
       {contactLine && (
        <div className="text-xs text-gray-600 mb-2">{contactLine}</div>
      )}

      {/* Render sections in the chosen order, honoring visibility */}
      {order.map((sectionId) => {
        switch (sectionId) {
          case "summary":
            return data.summary ? (
              <p
                key="summary"
                className="text-sm text-gray-700 mb-4"
              >
                {String(data.summary)}
              </p>
            ) : (
              <button
                key="summary"
                onClick={() => onEdit("summary")}
                className="text-xs underline mb-4"
              >
                Add summary
              </button>
            );

          case "experience":
            if (!exp.length) return null;
            return (
              <section key="experience" className="mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-600">
                  Experience
                </h3>
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
                        e.highlights
                          .slice(0, 2)
                          .map((h: any, j: number) => (
                            <div key={j} className="text-xs">
                              • {String(h)}
                            </div>
                          ))}
                    </li>
                  ))}
                </ul>
              </section>
            );

          case "education":
            if (!edu.length) return null;
            return (
              <section key="education" className="mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-600">
                  Education
                </h3>
                <ul className="mt-1 space-y-1">
                  {edu.map((ed: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">
                        {(ed?.degree || "Degree")}
                        {ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(ed?.institution || "School")}
                        {ed?.graduationDate ? ` • ${ed.graduationDate}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );

          case "skills":
            if (!skills) return null;
            return (
              <section key="skills">
                <h3 className="text-sm font-semibold uppercase text-gray-600">
                  Skills
                </h3>
                <p className="text-sm mt-1">{skills}</p>
              </section>
            );

          case "projects":
            // optional: render projects if present
            if (!Array.isArray(data.projects) || !data.projects.length)
              return null;
            return (
              <section key="projects" className="mt-4">
                <h3 className="text-sm font-semibold uppercase text-gray-600">
                  Projects
                </h3>
                <ul className="mt-1 space-y-1">
                  {data.projects.map((p: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">{p?.name || "Project"}</div>
                      {p?.technologies && (
                        <div className="text-xs text-gray-500">
                          {p.technologies}
                        </div>
                      )}
                      {p?.outcomes && (
                        <div className="text-xs">{p.outcomes}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
