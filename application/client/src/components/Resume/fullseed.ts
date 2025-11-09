// components/Resume/fullSeed.ts
export function fullSeedContent() {
  return {
    style: { primary: "#0f766e", font: "Inter, system-ui", text: "#1f2937" },
    layout: {
      columns: 1,
      // ⬇️ use strings, not {key,title} objects
      sections: [
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "certifications",
        "awards",
        "links",
      ],
    },
    profile: {
      name: "Your Name",
      title: "Desired Role / Title",
      email: "you@example.com",
      phone: "+1 (555) 555-1234",
      location: "City, ST",
      summary:
        "One-sentence pitch + 2–3 impact statements (include metrics).",
    },
    skills: [
      "JavaScript / TypeScript", "React", "Node.js", "Express", "MongoDB",
      "REST APIs", "Testing (Jest/Vitest)", "CI/CD (GitHub Actions)"
    ],
    experience: [
      {
        company: "Company Name",
        role: "Job Title",
        period: "2024 – Present",
        bullets: [
          "Led X to achieve Y (quantified result).",
          "Built/Improved Z using A, B, C.",
        ],
      },
    ],
    projects: [
      { name: "Flagship Project", desc: "Role, results", tech: ["React", "Node"] },
    ],
    education: [{ school: "University", degree: "B.S. Something", year: "2025" }],
    certifications: [{ name: "Certification", org: "Issuer", year: "2024" }],
    awards: [{ name: "Award", org: "Organization", year: "2023" }],
    links: [
      { label: "GitHub", url: "https://github.com/you" },
      { label: "LinkedIn", url: "https://linkedin.com/in/you" },
    ],
  };
}
