import React from "react";
import "../../styles/ResumePreview.css";

type Template = {
  _id: string;
  name: string;
  type: "chronological" | "functional" | "hybrid" | "custom";
  style?: { primary?: string; font?: string; text?: string };
  layout?: { columns?: number; sections?: Array<{ key: string; title: string }> };
};

type ResumeData = {
  profile: { name: string; title: string; email: string; phone: string; location: string; summary: string };
  skills: string[];
  experience: Array<{ company: string; role: string; period: string; bullets: string[] }>;
  education: Array<{ school: string; degree: string; year: string }>;
  projects: Array<{ name: string; desc: string; tech: string[] }>;
};

export default function ResumePageRenderer({
  template,
  data,
}: {
  template: Template;
  data: ResumeData;
}) {
  const primary = template.style?.primary || "#0f766e";
  const text = template.style?.text || "#1f2937";
  const font = template.style?.font || "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

  const columns = Math.max(1, Math.min(2, template.layout?.columns ?? (template.type === "functional" ? 2 : 1)));
  const sections = template.layout?.sections || [
    { key: "summary", title: "Summary" },
    { key: "skills", title: "Skills" },
    { key: "experience", title: "Experience" },
    { key: "projects", title: "Projects" },
    { key: "education", title: "Education" },
  ];

  return (
    <div className="resume-page" style={{ fontFamily: font, color: text }}>
      {/* Header */}
      <header className="resume-header" style={{ borderColor: primary }}>
        <div>
          <h1 className="resume-name">{data.profile.name}</h1>
          <div className="resume-title" style={{ color: primary }}>{data.profile.title}</div>
        </div>
        <div className="resume-contact">
          <div>{data.profile.email}</div>
          <div>{data.profile.phone}</div>
          <div>{data.profile.location}</div>
        </div>
      </header>

      {/* Content */}
      <main className={`resume-body cols-${columns}`}>
        {sections.map((s) => {
          switch (s.key) {
            case "summary":
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  <p className="resume-summary">{data.profile.summary}</p>
                </section>
              );
            case "skills":
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  <ul className="resume-skill-list">
                    {data.skills.map((sk, i) => <li key={i}>{sk}</li>)}
                  </ul>
                </section>
              );
            case "experience":
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  {data.experience.map((x, i) => (
                    <article key={i} className="resume-item">
                      <div className="resume-item-header">
                        <div className="resume-item-role">{x.role} • {x.company}</div>
                        <div className="resume-item-period">{x.period}</div>
                      </div>
                      <ul className="resume-bullets">
                        {x.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    </article>
                  ))}
                </section>
              );
            case "projects":
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  {data.projects.map((p, i) => (
                    <article key={i} className="resume-item">
                      <div className="resume-item-header">
                        <div className="resume-item-role">{p.name}</div>
                        <div className="resume-item-period">{p.tech.join(", ")}</div>
                      </div>
                      <p>{p.desc}</p>
                    </article>
                  ))}
                </section>
              );
            case "education":
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  {data.education.map((e, i) => (
                    <article key={i} className="resume-item">
                      <div className="resume-item-header">
                        <div className="resume-item-role">{e.degree}</div>
                        <div className="resume-item-period">{e.year}</div>
                      </div>
                      <div>{e.school}</div>
                    </article>
                  ))}
                </section>
              );
            default:
              return (
                <section key={s.key} className="resume-section">
                  <h2 style={{ borderColor: primary }}>{s.title}</h2>
                  <p>—</p>
                </section>
              );
          }
        })}
      </main>
    </div>
  );
}