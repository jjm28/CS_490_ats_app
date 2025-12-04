import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ======================================================
   SAFER JSON PARSER
====================================================== */
function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;

  // Try direct parsing
  try {
    return JSON.parse(str);
  } catch {}

  // Try extracting JSON inside ```json blocks
  const match = str.match(/```json([\s\S]*?)```/i);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // Try extracting inside brackets
  const bracketMatch = str.match(/\[([\s\S]*?)\]/);
  if (bracketMatch) {
    try {
      return JSON.parse(bracketMatch[0]);
    } catch {}
  }

  console.warn("❗ AI returned invalid JSON. Using fallback.");
  return fallback;
}

/* ======================================================
   INTERNAL HELPER — Faster, consistent OpenAI call
====================================================== */
async function ask(prompt) {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices?.[0]?.message?.content?.trim() || "";
}

/* ======================================================
   AI: Generate Referral Template
====================================================== */
export async function generateReferralTemplateAI({
  userName,
  referrerName,
  jobTitle,
  relationship,
  tone = "professional",
}) {
  try {
    const prompt = `
Write a ${tone} referral request email.

Required format:
---
Dear ${referrerName},

[Short message body]

Best regards,
${userName}
---

Context:
- Job: ${jobTitle}
- Relationship: ${relationship}

Rules:
- No placeholders.
- No brackets.
- No extra commentary.
- Only return the message.
    `.trim();

    return await ask(prompt);
  } catch (err) {
    console.error("Template Error:", err);
    return "";
  }
}

/* ======================================================
   AI: General Referral Source Suggestions
====================================================== */
export async function identifyReferralSourcesAI({ jobTitle }) {
  try {
    const prompt = `
Suggest 5 ideal referral sources for the job "${jobTitle}".

Return STRICT JSON ONLY:
[
  { "name": "John Doe", "role": "Engineer", "why": "..." }
]
    `.trim();

    const raw = await ask(prompt);
    return safeJsonParse(raw, []);
  } catch (err) {
    console.error("Source Suggestion Error:", err);
    return [];
  }
}

/* ======================================================
   AI: Etiquette Guidance
====================================================== */
export async function etiquetteGuidanceAI() {
  try {
    const prompt = `
Give 5 referral etiquette tips.
Format:
- Tip 1
- Tip 2
(no paragraphs)
    `.trim();

    return await ask(prompt);
  } catch (err) {
    console.error("Etiquette Error:", err);
    return "- Be respectful.\n- Keep it concise.\n- Provide context.\n- Allow decline.\n- Express gratitude.";
  }
}

/* ======================================================
   AI: Timing Suggestions
====================================================== */
export async function timingSuggestionsAI({ jobTitle }) {
  try {
    const prompt = `
Give 4 timing suggestions for requesting a referral for: ${jobTitle}
Format: bullet points only.
    `.trim();

    return await ask(prompt);
  } catch (err) {
    console.error("Timing Error:", err);
    return "- After applying\n- After networking\n- Early in hiring cycle\n- When job is newly posted";
  }
}

/* ======================================================
   AI: Relationship Strength (1–100)
====================================================== */
export async function scoreRelationshipAI({ relationship }) {
  try {
    const prompt = `
Rate relationship strength 1–100.

Relationship: "${relationship}"

Return ONLY a number.
    `.trim();

    const raw = await ask(prompt);
    const num = parseInt(raw, 10);
    return isNaN(num) ? 50 : num;
  } catch {
    return 50;
  }
}

/* ======================================================
   AI: Success Rate (1–100)
====================================================== */
export async function scoreSuccessRateAI({ jobTitle, relationship }) {
  try {
    const prompt = `
Estimate referral success probability (1–100).

Job: ${jobTitle}
Relationship: ${relationship}

Return ONLY a number.
    `.trim();

    const raw = await ask(prompt);
    const num = parseInt(raw, 10);
    return isNaN(num) ? 50 : num;
  } catch {
    return 50;
  }
}

/* ======================================================
   AI: Personalization Tips
====================================================== */
export async function scorePersonalizationAI({ jobTitle, relationship }) {
  try {
    const prompt = `
Give 5 personalization tips for a referral request.

Context:
- Job: ${jobTitle}
- Relationship: ${relationship}

Format:
- Tip 1
- Tip 2
- ...
    `.trim();

    const text = await ask(prompt);
    return text || "- Mention shared context\n- Reference past work\n- Personalize intro\n- Keep it warm\n- Thank them sincerely";
  } catch {
    return "- Mention shared context\n- Reference past work\n- Personalize intro\n- Keep it warm\n- Thank them sincerely";
  }
}

/* ======================================================
   AI: Referral Sources for Company + Job
====================================================== */
export async function scoreReferralSourcesAI({ jobTitle, targetCompany }) {
  try {
    const prompt = `
Suggest referral sources for company "${targetCompany}" for the role "${jobTitle}".

Return JSON ONLY:
[
  { "name": "...", "role": "...", "reason": "..." }
]
    `.trim();

    const raw = await ask(prompt);
    return safeJsonParse(raw, []);
  } catch (err) {
    console.error("Referral Source AI Error:", err);
    return [
      {
        name: `Senior Engineer at ${targetCompany}`,
        role: "Engineer",
        reason: "Likely knows the team.",
      },
      {
        name: `Recruiter at ${targetCompany}`,
        role: "Recruiter",
        reason: "Direct hiring involvement.",
      },
      {
        name: `Team Lead (${jobTitle})`,
        role: "Team Lead",
        reason: "Directly relevant.",
      },
    ];
  }
}
