// Seed system templates
import ResumeTemplate from "../models/resumeTemplate.js";

export async function ensureSystemTemplates() {
  const keys = ["chronological", "functional", "hybrid"];
  for (const k of keys) {
    const exists = await ResumeTemplate.findOne({ origin: "system", type: k });
    if (!exists) {
      await ResumeTemplate.create({
        title: k[0].toUpperCase() + k.slice(1),
        type: k,
        ownerId: null,
        origin: "system",
        style: {},
      });
    }
  }
}
