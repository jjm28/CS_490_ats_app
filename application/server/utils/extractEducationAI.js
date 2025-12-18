import OpenAI from "openai";
import { EDUCATION_LEVELS, EDUCATION_FIELDS } from "./staticEducation.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractEducationAI(description) {
    if (!description) return { level: null, fields: [] };

    try {
        const prompt = `
Extract EDUCATION REQUIREMENTS from this job description.

Return ONLY valid JSON in this format:
{
  "level": "bachelor | master | phd | associate | high school | null",
  "fields": ["computer science", "engineering", ...]
}

Description:
${description}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Extract structured education requirements from job descriptions."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0,
        });

        const raw = response.choices[0].message.content;

        try {
            return JSON.parse(raw);
        } catch (err) {
            console.error("❌ Education JSON parse failed:", raw);
            return fallbackEducationExtract(description);
        }

        return response.choices[0].message.parsed;
    } catch (err) {
        console.error("❌ OpenAI education extraction failed:", err);
        return fallbackEducationExtract(description);
    }
}

function fallbackEducationExtract(text) {
    const lower = text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[’']/g, "'");

    let level = null;

    if (lower.match(/bachelor/)) level = "bachelor";
    if (lower.match(/master/)) level = "master";
    if (lower.match(/ph\.?d/)) level = "phd";
    if (lower.match(/associate/)) level = "associate";
    if (lower.match(/high school/)) level = "high school";

    const fields = [];

    if (lower.includes("computer science")) fields.push("computer science");
    if (lower.includes("engineering")) fields.push("engineering");
    if (lower.includes("business")) fields.push("business");
    if (lower.includes("information technology")) fields.push("information technology");

    return { level, fields };
}