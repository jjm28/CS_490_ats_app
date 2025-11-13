import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ============================================
   1️⃣ Get job from DB
   ============================================ */
export async function getJob({ userId, id }) {
  const db = getDb();
  return await db.collection("jobs").findOne({ userId, _id: new ObjectId(id) });
}
/* ============================================
   2️⃣ Get cached salary data
   ============================================ */
export async function getSalaryResearch(jobId) {
  const db = getDb();
  return await db.collection("salaryResearch").findOne({ jobId });
}

/* ============================================
   3️⃣ Cache new salary data
   ============================================ */
export async function cacheSalaryData(jobId, data) {
  const db = getDb();
  return await db
    .collection("salaryResearch")
    .updateOne({ jobId }, { $set: data }, { upsert: true });
}

/* ============================================
   4️⃣ Generate Gemini summary + tips
   ============================================ */
export async function generateLLMSummaryAndTips({ jobTitle, company, location, description }) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Estimate a realistic U.S. salary range for a ${jobTitle} at ${company} in ${location || "the US"}.
      Also summarize what typically affects compensation for this role.
      Provide data in JSON format like:
      {
        "min": <number>,
        "max": <number>,
        "average": <number>,
        "summary": "<short explanation>",
        "tips": ["tip1", "tip2"]
      }
    `;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini salary generation error:", err);
    return {
      min: 0,
      max: 0,
      average: 0,
      summary: "Unable to fetch salary estimate.",
      tips: [],
    };
  }
}
