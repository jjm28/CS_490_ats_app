import express from "express";
const router = express.Router();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyJWT } from "../middleware/auth.js"; 
import Job from "../models/jobs.js";
import InterviewInsights from "../models/interviewInsights.js"; // ✅ New model

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ RATE LIMITER: Queue to prevent API spam
class RequestQueue {
  constructor(delayMs = 2000) {
    this.queue = [];
    this.processing = false;
    this.delayMs = delayMs;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    await new Promise(r => setTimeout(r, this.delayMs));
    this.processing = false;
    this.process();
  }
}

const geminiQueue = new RequestQueue(2000);

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
    console.log(`🔍 Fetching insights for job: ${jobId}`);

    // ✅ CHECK IF INSIGHTS ALREADY EXIST IN SEPARATE COLLECTION
    let cachedInsights = await InterviewInsights.findOne({ jobId, userId });
    
    if (cachedInsights) {
      console.log("💾 Returning cached insights from database");
      return res.json({
        processStages: cachedInsights.processStages,
        commonQuestions: cachedInsights.commonQuestions,
        interviewFormat: cachedInsights.interviewFormat,
        timeline: cachedInsights.timeline,
        preparationTips: cachedInsights.preparationTips,
        successTips: cachedInsights.successTips,
        interviewerInfo: cachedInsights.interviewerInfo,
        generatedAt: cachedInsights.generatedAt
      });
    }

    // ✅ FETCH JOB DETAILS FOR GENERATION
    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job not found for this user" });
    }

    const { jobTitle, company } = job;
    console.log(`🎯 Generating NEW insights for: ${jobTitle} at ${company}`);

    // ✅ ADD TO QUEUE TO RESPECT RATE LIMITS
    const insights = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash', // ✅ Use the latest stable version
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2096, // Reduced to save tokens
        }
      });

      const prompt = `Interview prep for ${jobTitle} at ${company}. Return JSON only:
{
  "processStages": ["stage1","stage2",...],
  "commonQuestions": ["q1","q2",...],
  "interviewFormat": "format description",
  "timeline": "timeline",
  "preparationTips": ["tip1","tip2",...],
  "successTips": ["tip1","tip2",...],
  "interviewerInfo": "interviewer info"
}`;

      console.log("🚀 Generating content with Gemini (via queue)...");
      
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      console.log("📝 RAW GEMINI RESPONSE:\n", rawText.substring(0, 500));

      // Clean and parse JSON
      let cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      let parsedInsights;
      try {
        parsedInsights = JSON.parse(cleaned);
        console.log("✅ Successfully parsed JSON");
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON:", parseErr);
        throw new Error("Failed to parse AI response");
      }

      // Validate and set defaults
      const requiredKeys = [
        "processStages", "commonQuestions", "interviewFormat",
        "timeline", "preparationTips", "successTips", "interviewerInfo"
      ];
      
      for (const key of requiredKeys) {
        if (!(key in parsedInsights)) {
          console.warn(`⚠️ Missing key: ${key}`);
          if (key === "interviewFormat" || key === "timeline" || key === "interviewerInfo") {
            parsedInsights[key] = "Information not available";
          } else {
            parsedInsights[key] = [];
          }
        }
      }

      return parsedInsights;
    });

    // ✅ SAVE TO SEPARATE INSIGHTS COLLECTION
    const savedInsights = await InterviewInsights.create({
      jobId,
      userId,
      jobTitle,
      company,
      ...insights
    });
    
    console.log("💾 Insights saved to separate collection");

    return res.json({
      processStages: savedInsights.processStages,
      commonQuestions: savedInsights.commonQuestions,
      interviewFormat: savedInsights.interviewFormat,
      timeline: savedInsights.timeline,
      preparationTips: savedInsights.preparationTips,
      successTips: savedInsights.successTips,
      interviewerInfo: savedInsights.interviewerInfo,
      generatedAt: savedInsights.generatedAt
    });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    
    // Handle rate limit errors specifically
    if (err.message?.includes("429") || err.message?.includes("quota")) {
      return res.status(429).json({
        error: "API rate limit reached. Please try again in a few moments.",
        retryAfter: 60
      });
    }

    res.status(500).json({
      error: "Failed to generate insights",
      details: err.message || "Unknown error"
    });
  }
});

// ✅ DELETE CACHED INSIGHTS (Force Regenerate)
router.delete("/:jobId", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { jobId } = req.params;

    const deleted = await InterviewInsights.findOneAndDelete({ jobId, userId });
    
    if (!deleted) {
      return res.status(404).json({ error: "No cached insights found" });
    }

    console.log("🗑️ Cached insights deleted");
    res.json({ message: "Insights cleared. Will regenerate on next request." });

  } catch (err) {
    console.error("Error deleting insights:", err);
    res.status(500).json({ error: "Failed to delete insights" });
  }
});

// ✅ GET QUEUE STATUS
router.get("/queue/status", (req, res) => {
  res.json({
    queueLength: geminiQueue.queue.length,
    processing: geminiQueue.processing,
    estimatedWaitTime: geminiQueue.queue.length * 2
  });
});

export default router;