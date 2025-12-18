import express from "express";
import InterviewCoachingInsight from "../models/coachinginsights.js";
import { verifyJWT } from "../middleware/auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logApiCall } from "../middleware/apiLogger.js";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST: Analyze response and save coaching insight
 */
router.post("/analyze", verifyJWT, async (req, res) => {
  const startTime = Date.now(); 
  try {
    const { question, response } = req.body;
    
    if (!question || !response) {
      return res.status(400).json({ error: "Question and response are required" });
    }
    
    console.log(`[Interview Analysis] Starting analysis...`);
    console.log(`[Interview Analysis] Question:`, question);
    console.log(`[Interview Analysis] Response:`, response);
    
    const prompt = `You are an expert interview coach. Analyze this interview response and provide detailed feedback.

Interview Question: ${question}
Candidate Response: ${response}

Respond ONLY with valid JSON (no markdown, no backticks, no code blocks). Use exactly this format with real values:

{
  "overallScore": 8,
  "relevanceScore": 7,
  "specificityScore": 8,
  "impactScore": 9,
  "starAdherence": {
    "situation": "Yes",
    "task": "Yes",
    "action": "Yes",
    "result": "No",
    "feedback": "Your response included situation, task, and action but lacked measurable results."
  },
  "wordCount": 150,
  "estimatedTime": "1 minute 30 seconds",
  "strengths": ["Clear explanation of the problem", "Good structure"],
  "weaknesses": ["Missing quantifiable results", "Could be more specific about impact"],
  "weakLanguagePatterns": ["I think", "maybe"],
  "suggestions": ["Add specific metrics to show impact", "Be more confident in your language"],
  "alternativeApproach": "Start with the challenge you faced, explain your specific solution with technical details, then highlight the measurable impact with numbers.",
  "overallFeedback": "Good response with clear structure but needs more quantifiable results to demonstrate impact."
}

Important: Return ONLY the JSON object, nothing else.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseTime = Date.now() - startTime;
    await logApiCall('gemini', '/generateContent', 200, responseTime);
    let rawText = result.response.text();
    console.log(`[Interview Analysis] Raw AI response:`, rawText);
    
    let cleaned = rawText.replace(/```json|```/g, "").trim();
    console.log(`[Interview Analysis] Cleaned response:`, cleaned);
    
    let analysis;
    try {
      analysis = JSON.parse(cleaned);
      console.log(`[Interview Analysis] ✅ Successfully parsed JSON`);
      console.log(`[Interview Analysis] Analysis object:`, JSON.stringify(analysis, null, 2));
    } catch (parseErr) {
      console.error(`[Interview Analysis] ❌ JSON Parse Error:`, parseErr.message);
      console.error(`[Interview Analysis] Failed text:`, cleaned);
      return res.status(500).json({ 
        error: "Failed to parse AI response",
        details: parseErr.message,
        rawResponse: cleaned
      }); 
            const responseTime = Date.now() - startTime;
await logApiCall('gemini', '/generateContent', 500, responseTime, err.message); 
    }
    
    
    // Log what we're about to save
    const dataToSave = {
      userId: req.user._id,
      question,
      response,
      scores: {
        relevance: analysis.relevanceScore,
        specificity: analysis.specificityScore,
        impact: analysis.impactScore,
        clarity: analysis.overallScore
      },
      star: {
        situation: analysis.starAdherence?.situation,
        task: analysis.starAdherence?.task,
        action: analysis.starAdherence?.action,
        result: analysis.starAdherence?.result
      },
      weaknesses: analysis.weaknesses,
      suggestions: analysis.suggestions,
      alternativeApproach: analysis.alternativeApproach
    };
    
    console.log(`[Interview Analysis] Data to save:`, JSON.stringify(dataToSave, null, 2));
    
    const savedInsight = await InterviewCoachingInsight.create(dataToSave);
    
    console.log(`[Interview Analysis] ✅ Saved to database with ID:`, savedInsight._id);
    console.log(`[Interview Analysis] Saved document:`, JSON.stringify(savedInsight.toObject(), null, 2));

    res.json({
      message: "Analysis complete",
      analysis: analysis,
      insight: savedInsight
    });
    
  } catch (err) {
    console.error(`[Interview Analysis] ❌ Error:`, err);
    res.status(500).json({ 
      error: "Failed to analyze response",
      details: err.message,
      stack: err.stack
    });
  }
});
/**
 * GET: All coaching insights for current user
 */
router.get("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const insights = await InterviewCoachingInsight
      .find({ userId })
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (err) {
    console.error("Error fetching insights:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET: Coaching insight by ID
 */
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const insight = await InterviewCoachingInsight.findOne({
      _id: req.params.id,
      userId,
    });
    if (!insight) return res.status(404).json({ error: "Not found" });
    res.json(insight);
  } catch (err) {
    console.error("Error fetching insight:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE: Remove a coaching insight
 */
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const deleted = await InterviewCoachingInsight.findOneAndDelete({
      _id: req.params.id,
      userId,
    });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting insight:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;