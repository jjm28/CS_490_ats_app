import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// AI summary + next steps
export async function analyzeContact(contact) {
  const prompt = `
You are an AI networking coach.

Summarize this contact and give actionable steps.

Contact:
${JSON.stringify(contact, null, 2)}
  `;

  const resp = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.choices[0].message.content;

  return {
    summary: text.split("Next Steps:")[0].trim(),
    nextSteps: text.includes("Next Steps:")
      ? text.split("Next Steps:")[1].trim()
      : "Follow up in 2–3 weeks.",
    interests: await extractInterests(contact),
  };
}


// Extract interests
export async function extractInterests(contact) {
  const prompt = `
Extract personal or professional interests mentioned:

${contact.personalNotes}
${contact.professionalNotes}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return resp.choices[0].message.content;
}


// Relationship strength (simple formula)
export function computeRelationshipStrength(contact) {
  const recency = contact.lastInteraction
    ? (Date.now() - new Date(contact.lastInteraction).getTime()) / (1000 * 86400)
    : 999;

  const interactionCount = contact.interactions.length;

  return Math.max(
    10,
    100 - recency * 2 + interactionCount * 5
  );
}
