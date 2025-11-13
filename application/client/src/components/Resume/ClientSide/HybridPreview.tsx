import React from "react";
import type { ResumePreviewProps, SectionId } from "..";

function toNameList(arr: any): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((x) => (typeof x === "string" ? x : x?.name))
    .filter(Boolean)
    .join(", ");
}

export default function HybridPreview({
  data,
  onEdit,
  className,
  visibleSections,
  sectionOrder,
}: ResumePreviewProps) {
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const skills = toNameList(data.skills);
  const edu = Array.isArray(data.education) ? data.education : [];

  const contactBits = [
    data.contact?.email,
    data.contact?.phone,
    data.contact?.location,
    data.contact?.website,
    data.contact?.linkedin,
    data.contact?.github,
  ].filter(Boolean);
  const contactLine = contactBits.join(" | ");

  // ---- visibility + ordering helpers ----
  const isVisible = (id: SectionId) => {
    if (!visibleSections) return true;
    return visibleSections.includes(id);
  };

  const defaultOrder: SectionId[] = [
    "summary",
    "experience",
    "education",
    "skills",
  ];

  const order: SectionId[] = (
    sectionOrder && sectionOrder.length ? sectionOrder : defaultOrder
  ).filter((id: SectionId) => isVisible(id));

  return (
    <div className={className}>
      {/* Header always visible */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{data.name || "Your Name"}</h2>
        <button
          onClick={() => onEdit("header")}
          className="text-xs underline"
        >
          Edit name
        </button>
      </div>
      {contactLine && (
        <div className="text-xs text-gray-600 mb-2">{contactLine}</div>
      )}

      {/* Render sections in chosen order */}
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
                  {exp.slice(0, 3).map((e: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">
                        {(e?.jobTitle || "Title")} •{" "}
                        {(e?.company || "Company")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(e?.startDate || "")} –{" "}
                        {(e?.endDate || "Present")}
                        {e?.location ? ` • ${e.location}` : ""}
                      </div>
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
                  {edu.slice(0, 2).map((ed: any, i: number) => (
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
              <section key="skills" className="mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-600">
                  Skills
                </h3>
                <p className="text-sm mt-1">{skills || "—"}</p>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
