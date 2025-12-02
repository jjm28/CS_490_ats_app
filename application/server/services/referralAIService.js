import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ======================================================
   SAFE PARSER — prevents crashes when JSON fails
====================================================== */
function safeJsonParse(str, fallback = []) {
  try {
    return JSON.parse(str);
  } catch {
    console.warn("AI returned invalid JSON — using fallback.");
    return fallback;
  }
}

/* ======================================================
   AI: Generate Referral Template
====================================================== */
export async function generateReferralTemplateAI({
  userName,
  jobTitle,
  relationship,
}) {
  try {
    const prompt = `
Write a professional referral request message.

User requesting referral: ${userName}
Job applied for: ${jobTitle}
Relationship with referrer: ${relationship}

Return ONLY the message text. No quotes, no labels.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("AI Template Error:", err);
    return "";
  }
}

/* ======================================================
   AI: General Referral Source Suggestions
====================================================== */
export async function identifyReferralSourcesAI({ jobTitle }) {
  try {
    const prompt = `
Suggest 5 ideal referral sources for the job title: "${jobTitle}".

Return a STRICT JSON array:
[
  { "name": "John Doe", "role": "Engineer", "why_good_fit": "..." },
  ...
]
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return safeJsonParse(completion.choices?.[0]?.message?.content, []);
  } catch (err) {
    console.error("AI Source Suggestion Error:", err);
    return [];
  }
}

/* ======================================================
   AI: Etiquette Guidance
====================================================== */
export async function etiquetteGuidanceAI() {
  try {
    const prompt = `
Provide 4–6 bullet points on referral request etiquette.
Keep each bullet short. No paragraphs.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Etiquette AI Error:", err);
    return "";
  }
}

/* ======================================================
   AI: Timing Suggestions
====================================================== */
export async function timingSuggestionsAI({ jobTitle }) {
  try {
    const prompt = `
Give 3–4 recommendations for the best timing to request a referral
for the job title: "${jobTitle}".

Return bullet points only.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Timing AI Error:", err);
    return "";
  }
}

/* ======================================================
   AI: Relationship Strength Scoring (1–100)
====================================================== */
export async function scoreRelationshipAI({ relationship }) {
  try {
    const prompt = `
Rate the professional relationship strength (1–100).

Relationship description:
"${relationship}"

Return ONLY a number. No words.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const number = parseInt(
      completion.choices?.[0]?.message?.content.trim() || "",
      10
    );

    return isNaN(number) ? 50 : number;
  } catch (err) {
    console.error("Relationship Score Error:", err);
    return 50;
  }
}

/* ======================================================
   AI: Success Rate (1–100)
====================================================== */
export async function scoreSuccessRateAI({ jobTitle, relationship }) {
  try {
    const prompt = `
Estimate referral success probability (1–100%).

Job Title: ${jobTitle}
Relationship: ${relationship}

Return ONLY a number.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const number = parseInt(
      completion.choices?.[0]?.message?.content.trim() || "",
      10
    );

    return isNaN(number) ? 50 : number;
  } catch (err) {
    console.error("Success Rate Error:", err);
    return 50;
  }
}

/* ======================================================
   AI: Personalization Insights
====================================================== */
export async function scorePersonalizationAI({ jobTitle, relationship }) {
  try {
    const prompt = `
Generate 5 short, helpful personalization tips for writing a referral request.

• Job Title: ${jobTitle}
• Relationship: ${relationship}

Return ONLY bullet points separated by newline.
Example format:
- Tip 1
- Tip 2
- Tip 3
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });

    let text = completion.choices[0].message.content || "";

    // ✔ Safety: if output is empty, give fallback tips
    if (!text.trim()) {
      text = `
- Highlight your shared background or connection.
- Mention how your relationship supports your qualifications.
- Refer to a specific interaction that demonstrates your strengths.
- Show relevance between their experience and your goal.
- Express appreciation tailored to your relationship.
      `;
    }

    return text;

  } catch (err) {
    console.error("AI Personalization Error:", err);

    // ✔ fallback if AI fails
    return `
- Reference your past interactions with the referrer.
- Personalize your request based on your relationship history.
- Mention a shared project or achievement.
- Show gratitude tailored to how well you know each other.
- Keep your tone aligned with the closeness of the relationship.
    `;
  }
}

/* ======================================================
   AI: Company-Based Referral Source Finder
====================================================== */
export async function scoreReferralSourcesAI({ jobTitle, targetCompany }) {
  try {
    const prompt = `
Recommend referral sources for:

Company: ${targetCompany}
Role: ${jobTitle}

Return STRICT JSON:
[
  { "name": "...", "role": "...", "reason": "..." }
]
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "";
    return safeJsonParse(raw, []);

  } catch (err) {
    console.error("Referral Source AI Error:", err);

    // ----------- FALLBACK (IMPORTANT!) ------------
    return [
      {
        name: "Senior Developer at " + targetCompany,
        role: "Engineer",
        reason: "Likely knowledgeable about the hiring team.",
      },
      {
        name: "Recruiter at " + targetCompany,
        role: "Recruiter",
        reason: "Directly involved in candidate sourcing.",
      },
      {
        name: "Team Lead - " + jobTitle,
        role: "Team Lead",
        reason: "Works on similar projects and can vouch for skills.",
      },
    ];
  }
}

