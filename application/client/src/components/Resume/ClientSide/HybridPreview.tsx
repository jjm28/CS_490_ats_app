// src/components/Resume/ClientSide/HybridPreview.tsx
import React from "react";
import type { ResumePreviewProps, SectionId } from "..";
import type { ResumeTheme } from "../resumeThemes";

type Props = ResumePreviewProps & {
  visibleSections?: SectionId[];
  sectionOrder?: SectionId[];
  theme?: ResumeTheme;
};

const DEFAULT_THEME: ResumeTheme = {
  primary: "#38bdf8",
  text: "#e5e7eb",
  muted: "#9ca3af",
  bg: "#020617",
  border: "#1f2937",
  label: "Hybrid",
};

const ALL_SECTIONS: SectionId[] = [
  "header",
  "contact",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
];

function isVisible(id: SectionId, visible?: SectionId[]) {
  return !visible || visible.includes(id);
}

export default function HybridPreview(props: Props) {
  const { data, className, visibleSections, sectionOrder, theme } = props;
  const t = theme || DEFAULT_THEME;

  const contact: any = (data as any).contact || {};
  const experience = Array.isArray((data as any).experience)
    ? (data as any).experience
    : [];
  const education = Array.isArray((data as any).education)
    ? (data as any).education
    : [];
  const projects = Array.isArray((data as any).projects)
    ? (data as any).projects
    : [];
  const skills = Array.isArray((data as any).skills)
    ? (data as any).skills
    : [];

  const order =
    (sectionOrder && sectionOrder.length ? sectionOrder : ALL_SECTIONS).filter(
      (id) =>
        id !== "header" &&
        id !== "contact" &&
        isVisible(id as SectionId, visibleSections)
    ) as SectionId[];

  return (
    <article
      className={`rounded-2xl border shadow-sm text-sm leading-relaxed ${
        className ?? ""
      }`}
      style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
    >
      {/* HEADER */}
      {isVisible("header", visibleSections ?? undefined) && (
        <header
          className="border-b px-6 pt-5 pb-3"
          style={{ borderColor: t.border }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ color: t.primary }}
              >
                {data.name || "Your Name"}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
                style={{ borderColor: t.border, color: t.muted }}
              >
                {t.label}
              </span>
            </div>
          </div>

          {isVisible("contact", visibleSections ?? undefined) && (
            <div
              className="mt-3 flex flex-wrap gap-2 text-[11px]"
              style={{ color: t.muted }}
            >
              {contact.email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                  <span className="font-medium">@</span>
                  <span>{contact.email}</span>
                </span>
              )}
              {contact.phone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                  <span className="font-medium">☎</span>
                  <span>{contact.phone}</span>
                </span>
              )}
              {contact.location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                  <span className="font-medium">📍</span>
                  <span>{contact.location}</span>
                </span>
              )}
              {contact.website && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                  <span className="font-medium">🌐</span>
                  <span>{contact.website}</span>
                </span>
              )}
            </div>
          )}
        </header>
      )}

      {/* BODY – same behavior as the others */}
      <div className="space-y-4 px-6 pb-5 pt-3">
        {order.map((sectionId) => {
          if (sectionId === "summary" && data.summary) {
            return (
              <section key="summary">
                <h3
                  className="mb-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.primary }}
                >
                  Summary
                </h3>
                <p className="text-xs" style={{ color: t.muted }}>
                  {data.summary}
                </p>
              </section>
            );
          }

          if (sectionId === "experience" && experience.length) {
            return (
              <section key="experience">
                <h3
                  className="mb-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.primary }}
                >
                  Experience
                </h3>
                <div className="space-y-2 text-xs">
                  {experience.map((exp: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <div className="font-semibold">
                            {exp.jobTitle || exp.position || "Job Title"}
                          </div>
                          {(exp.company || exp.employer) && (
                            <div
                              className="text-[11px]"
                              style={{ color: t.muted }}
                            >
                              {exp.company || exp.employer}
                            </div>
                          )}
                        </div>
                        {(exp.startDate || exp.endDate || exp.location) && (
                          <div
                            className="text-[10px] text-right"
                            style={{ color: t.muted }}
                          >
                            <div>
                              {exp.startDate || "Start"} –{" "}
                              {exp.endDate || "Present"}
                            </div>
                            {exp.location && <div>{exp.location}</div>}
                          </div>
                        )}
                      </div>
                      {exp.highlights && Array.isArray(exp.highlights) && (
                        <ul className="mt-1 list-disc pl-4 text-[11px]">
                          {exp.highlights
                            .slice(0, 3)
                            .map((h: string, i: number) => (
                              <li key={i}>{h}</li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (sectionId === "education" && education.length) {
            return (
              <section key="education">
                <h3
                  className="mb-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.primary }}
                >
                  Education
                </h3>
                <div className="space-y-1.5 text-xs">
                  {education.map((ed: any, idx: number) => {
                    const line1 = [ed.degree, ed.fieldOfStudy]
                      .filter(Boolean)
                      .join(", ");
                    const institution =
                      ed.institution || ed.school || "School Name";
                    return (
                      <div key={idx}>
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-semibold">{institution}</div>
                          {ed.graduationDate && (
                            <div
                              className="text-[10px]"
                              style={{ color: t.muted }}
                            >
                              {ed.graduationDate}
                            </div>
                          )}
                        </div>
                        {line1 && (
                          <div
                            className="text-[11px]"
                            style={{ color: t.muted }}
                          >
                            {line1}
                          </div>
                        )}
                        {ed.gpa && (
                          <div
                            className="text-[11px]"
                            style={{ color: t.muted }}
                          >
                            GPA: {ed.gpa}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (sectionId === "projects" && projects.length) {
            return (
              <section key="projects">
                <h3
                  className="mb-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.primary }}
                >
                  Projects
                </h3>
                <div className="space-y-1.5 text-xs">
                  {projects.map((proj: any, idx: number) => {
                    const techList = Array.isArray(proj.technologies)
                      ? proj.technologies.join(", ")
                      : proj.technologies || "";
                    return (
                      <div key={idx}>
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-semibold">
                            {proj.name || "Project Name"}
                          </div>
                          {proj.link && (
                            <a
                              href={proj.link}
                              className="text-[10px] underline"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: t.muted }}
                            >
                              {proj.link}
                            </a>
                          )}
                        </div>
                        {proj.role && (
                          <div
                            className="text-[11px]"
                            style={{ color: t.muted }}
                          >
                            Role: {proj.role}
                          </div>
                        )}
                        {techList && (
                          <div
                            className="text-[11px]"
                            style={{ color: t.muted }}
                          >
                            Technologies: {techList}
                          </div>
                        )}
                        {proj.outcomes && (
                          <p
                            className="mt-0.5 text-[11px]"
                            style={{ color: t.muted }}
                          >
                            {proj.outcomes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (sectionId === "skills" && skills.length) {
            const flatSkills: string[] = skills.flatMap((s: any) =>
              Array.isArray(s.items)
                ? s.items
                : s.name
                ? [s.name]
                : []
            );
            if (!flatSkills.length) return null;

            return (
              <section key="skills">
                <h3
                  className="mb-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.primary }}
                >
                  Skills
                </h3>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {flatSkills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="rounded-full border px-2 py-0.5"
                      style={{ borderColor: t.border }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>
    </article>
  );
}
