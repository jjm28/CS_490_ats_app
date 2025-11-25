import express from "express";
const router = express.Router();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyJWT } from "../middleware/auth.js"; 
import Job from "../models/jobs.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
router.use(verifyJWT);

router.get("/:jobId", async (req, res) => {
  try {
    console.log("✅ interview-insights route hit");
    const userId = req.user?._id;
    if (!userId) {
      console.log("❌ No user ID found");
      return res.status(401).json({ error: "Not logged in" });
    }

    const { jobId } = req.params;
    console.log(`🔍 Fetching job with ID: ${jobId} for user: ${userId}`);

    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job not found for this user" });
    }

    // ✅ CHECK IF INSIGHTS ALREADY EXIST IN DATABASE
    if (job.insights) {
      console.log("💾 Returning cached insights from database");
      return res.json(job.insights);
    }

    const { jobTitle, company } = job;
    console.log(`🎯 Generating NEW insights for: ${jobTitle} at ${company}`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `Research comprehensive interview preparation information for a ${jobTitle} position at ${company}.

Return ONLY a valid JSON object (no markdown, no explanations) with these exact keys:

{
  "processStages": ["stage 1", "stage 2", ...],
  "commonQuestions": ["question 1", "question 2", ...],
  "interviewFormat": "description of format",
  "timeline": "expected timeline description",
  "preparationTips": ["tip 1", "tip 2", ...],
  "successTips": ["tip 1", "tip 2", ...],
  "interviewerInfo": "information about interviewers"
}

Focus on:
- Specific interview stages for this company
- Real questions asked at ${company}
- Their specific interview format and culture
- Realistic timeline expectations
- Actionable preparation advice`;

    console.log("🚀 Generating content with Gemini...");
    
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    console.log("📝 RAW GEMINI RESPONSE:\n", rawText.substring(0, 500));

    // Clean and parse JSON
    let cleaned = rawText.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    let insights;
    try {
      insights = JSON.parse(cleaned);
      console.log("✅ Successfully parsed JSON");
    } catch (parseErr) {
      console.error("❌ Failed to parse JSON:", parseErr);
      return res.status(500).json({
        error: "Failed to parse AI response",
        rawResponse: rawText.substring(0, 500)
      });
    }

    // Validate and set defaults
    const requiredKeys = [
      "processStages", "commonQuestions", "interviewFormat",
      "timeline", "preparationTips", "successTips", "interviewerInfo"
    ];
    
    for (const key of requiredKeys) {
      if (!(key in insights)) {
        console.warn(`⚠️ Missing key: ${key}`);
        if (key === "interviewFormat" || key === "timeline" || key === "interviewerInfo") {
          insights[key] = "Information not available";
        } else {
          insights[key] = [];
        }
      }
    }

    // ✅ SAVE INSIGHTS TO DATABASE FOR FUTURE USE
    job.insights = insights;
    await job.save();
    console.log("💾 Insights saved to database");

    return res.json(insights);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({
      error: "Failed to generate insights",
      details: err.message || "Unknown error"
    });
  }
});

// ✅ NEW ENDPOINT: Force regenerate insights
router.post("/:jobId/regenerate", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { jobId } = req.params;

    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Clear existing insights to force regeneration
    job.insights = null;
    await job.save();

    console.log("🔄 Insights cleared, will regenerate on next request");
    return res.json({ message: "Insights cleared successfully" });

  } catch (err) {
    console.error("Error clearing insights:", err);
    res.status(500).json({ error: "Failed to clear insights" });
  }
});

export default router;