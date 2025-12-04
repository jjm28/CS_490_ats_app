import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ---- Safe JSON cleaner (handles messy Gemini output) ----
function cleanJson(raw) {
  if (!raw) return null;

  try {
    raw = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/[\u0000-\u001F]+/g, "") // remove hidden control chars
      .trim();

    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️ AI JSON parse failed:", err.message);
    return null;
  }
}

// Centralized model initialization
function model() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

// ====================================================
// 1. AI Contact Profile
// ====================================================
export async function aiContactProfile(contact) {
  const prompt = `
Generate a detailed professional network profile.

Contact:
- Name: ${contact.name}
- Company: ${contact.company}
- Title: ${contact.jobTitle}
- Industry: ${contact.industry}

Return valid JSON only:

{
 "relationshipStrength": number,
 "relevanceScore": number,
 "insights": string[],
 "recommendedNextActions": string[]
}
`;

  const result = await model().generateContent(prompt);
  return cleanJson(result.response.text());
}

// ====================================================
// 2. Relationship Score
// ====================================================
export async function aiRelationshipScore(contact, interactions) {
  const prompt = `
Evaluate relationship strength.

Contact: ${contact.name}
Interactions: ${JSON.stringify(interactions, null, 2)}

Return valid JSON only:

{
 "strengthScore": number,
 "summary": string
}
`;

  const result = await model().generateContent(prompt);
  return cleanJson(result.response.text());
}

// ====================================================
// 3. Outreach Message Generator
// ====================================================
export async function aiOutreach(contact, job) {
  const prompt = `
Write a concise, professional networking outreach message.

Contact:
- Name: ${contact.name}
- Role: ${contact.jobTitle}
- Company: ${contact.company}

Job I'm pursuing:
- ${job?.jobTitle || ""}
- ${job?.company || ""}

Return plain text only (no JSON, no markdown).
`;

  const result = await model().generateContent(prompt);
  return result.response.text().trim();
}

// ====================================================
// 4. Interaction Sentiment Analysis
// ====================================================
export async function aiInteractionSentiment(text) {
  const prompt = `
Analyze the sentiment of this interaction.

Text:
"${text}"

Return valid JSON only:

{
 "score": number,
 "summary": string
}
`;

  const result = await model().generateContent(prompt);
  return cleanJson(result.response.text());
}

// ====================================================
// 5. Opportunity Match
// ====================================================
export async function aiOpportunityMatch(contact, jobs) {
  const prompt = `
Identify job opportunities where this contact can help.

Contact industry: ${contact.industry}

Jobs:
${JSON.stringify(jobs, null, 2)}

Return a valid JSON array only:

[
  { "jobTitle": string, "company": string, "matchScore": number }
]
`;

  const result = await model().generateContent(prompt);
  return cleanJson(result.response.text());
}
