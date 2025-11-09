import ResumeTemplate from "../models/resumeTemplate.js";

// Seed 3 system templates once (call after DB connect)
export async function ensureSystemTemplates() {
  const count = await ResumeTemplate.countDocuments({ origin: "system" });
  if (count > 0) return;

  const common = {
    ownerId: null,
    isShared: true,
    sharedWith: [],
    isDefaultForOwner: false,
  };

  await ResumeTemplate.insertMany([
    {
      name: "Chronological",
      type: "chronological",
      origin: "system",
      style: { primary: "#0ea5e9", font: "Inter" },
      layout: { columns: 1, sections: ["header", "summary", "experience", "education", "skills"] },
      ...common,
    },
    {
      name: "Functional",
      type: "functional",
      origin: "system",
      style: { primary: "#22c55e", font: "Inter" },
      layout: { columns: 1, sections: ["header", "summary", "skills", "projects", "experience", "education"] },
      ...common,
    },
    {
      name: "Hybrid",
      type: "hybrid",
      origin: "system",
      style: { primary: "#f59e0b", font: "Inter" },
      layout: { columns: 2, sections: ["header", "summary", "skills", "experience", "education"] },
      ...common,
    },
  ]);
}
