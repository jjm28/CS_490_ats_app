// utils/extractSkillsAI.js
import OpenAI from "openai";
import { STATIC_SKILLS } from "./staticSkills.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractSkillsAI(description) {
    if (!description) return [];

    try {
        const prompt = `
      Extract the SKILLS from this job description.
      Return ONLY a JSON array of lowercase skill names.

      Description:
      ${description}
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_array" },
        });

        return response.choices[0].message.parsed.map((s) => s.toLowerCase());

    } catch (err) {
        console.warn("⚠️ AI extraction failed — using fallback:", err.message);
        return fallbackExtract(description);
    }
}

function fallbackExtract(description) {
    const text = description.toLowerCase();
    const found = new Set();

    for (const skill of STATIC_SKILLS) {
        if (text.includes(skill.toLowerCase())) {
            found.add(skill.toLowerCase());
        }
    }

    return Array.from(found);
}