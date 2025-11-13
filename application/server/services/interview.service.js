import { getDb } from "../db/connection.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getInterviewInsights(company) {
  const db = getDb();
  const collection = db.collection("interviewInsights");

  // 🔹 Check cached data
  const cached = await collection.findOne({ company });
  if (cached && (Date.now() - new Date(cached.updatedAt)) < 1000 * 60 * 60 * 24 * 7) {
    console.log("✅ Using cached interview insights");
    return cached;
  }

  console.log("💬 Generating new interview insights for:", company);

  // 🔹 Generate insights using Gemini
  const prompt = `
    Provide detailed interview insights for the company "${company}".
    Include:
    - Common interview stages (phone, technical, behavioral)
    - Typical interview questions or formats
    - Key skills evaluated
    - Difficulty level and unique aspects
    - Preparation recommendations and insider tips
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const response = await model.generateContent(prompt);
  const text = response.response.text();

  const insights = {
    company,
    summary: text,
    updatedAt: new Date(),
  };

  // 🔹 Cache it
  await collection.updateOne(
    { company },
    { $set: insights },
    { upsert: true }
  );

  return insights;
}
