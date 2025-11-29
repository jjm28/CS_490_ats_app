import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);

export async function getGeminiSalaryInsights(jobTitle: string, company?: string, location?: string) {
  const prompt = `
You are a compensation analyst. Analyze the salary range and insights for:
- Job Title: ${jobTitle}
- Company: ${company ?? "N/A"}
- Location: ${location ?? "N/A"}

Provide:
1. Estimated salary range (min, max, average)
2. Key compensation components (bonus, stock, benefits)
3. Negotiation advice in 2 sentences
4. JSON response with keys: min, max, average, breakdown, insights
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Try parsing JSON if included
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonText = text.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonText);
  } catch {
    return { error: "Failed to parse Gemini output", raw: text };
  }
}
