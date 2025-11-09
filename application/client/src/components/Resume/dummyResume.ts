// components/Resume/dummyResume.ts
export function dummyDataFor(type: "chronological" | "functional" | "hybrid" | "custom") {
  const base = {
    profile: {
      name: "Alex Johnson",
      title: type === "functional" ? "Full-Stack Engineer • Problem Solver" : "Software Engineer",
      email: "alex@example.com",
      phone: "+1 (555) 555-1234",
      location: "Newark, NJ",
      summary:
        "Full-stack engineer with 4+ years building product experiences in React, Node, and MongoDB. Passionate about performance, DX, and clean architecture.",
    },
    skills: ["React", "TypeScript", "Node.js", "Express", "MongoDB", "REST APIs", "Docker", "CI/CD"],
    experience: [
      {
        company: "OnTrac Systems",
        role: "Software Engineer",
        period: "2023 – Present",
        bullets: [
          "Built resume builder features (templates, previews, editor) using React + Express.",
          "Improved API performance by 35% by optimizing MongoDB queries and adding indexes.",
        ],
      },
      {
        company: "Acme Labs",
        role: "Junior Developer",
        period: "2021 – 2023",
        bullets: [
          "Developed internal tools for analytics dashboards and automation scripts.",
          "Collaborated with a cross-functional team to ship high-quality features on time.",
        ],
      },
    ],
    education: [{ school: "NJIT", degree: "B.S. Computer Science", year: "2025" }],
    projects: [
      {
        name: "ATS Resume Builder",
        desc: "End-to-end resume builder with templates, preview, and PDF export.",
        tech: ["React", "Express", "MongoDB"],
      },
    ],
  };

  // You can tweak ordering or content per template type here if desired:
  return base;
}
