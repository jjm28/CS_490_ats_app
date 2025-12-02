import express from "express";
const router = express.Router();
import { verifyJWT } from "../middleware/auth.js";
import Job from "../models/jobs.js";
import InterviewQuestions from "../models/interviewQuestions.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import coachinginsights from "../models/coachinginsights.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.use(verifyJWT);
function prompt(job) {
  return `
    You are an AI that generates interview questions based on a job posting.
    Job Title: "${job.jobTitle}"
    Company: "${job.company}"
    Job Description: "${job.jobDescription}"
    
    Return ONLY valid JSON with this EXACT structure:
    {
      "questions": [
        {
          "id": "unique_id",
          "text": "the question text",
          "category": "behavioral" | "technical" | "situational",
          "difficulty": "entry" | "mid" | "senior",
          "skills": ["skill1", "skill2"],
          "companySpecific": true/false
        }
      ]
    }
    
    Rules:
    - Generate 3-5 technical questions (category: "technical")
    - Generate 3-5 behavioral questions (category: "behavioral")
    - Generate 2-3 situational questions (category: "situational")
    - Set "companySpecific" to true ONLY if the question directly relates to ${job.company}
    - Extract relevant skills from the job description for technical questions
    - Set difficulty based on the job level (entry/mid/senior)
    - Do NOT wrap JSON in markdown or backticks
    `;
}
router.get("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`[Interview Questions] Fetching all questions for userId: ${userId}`);
    
    // Fetch all interview questions for this user
    const allQuestions = await InterviewQuestions.find({ userId });
    
    if (!allQuestions || allQuestions.length === 0) {
      console.log(`[Interview Questions] No questions found for user`);
      return res.json([]);
    }
    
    console.log(`[Interview Questions] Found ${allQuestions.length} question sets`);
    
    // Return the raw data - frontend will handle formatting
    res.json(allQuestions);
    
  } catch (err) {
    console.error(`[Interview Questions] Error:`, err);
    res.status(500).json({ 
      error: "Failed to fetch questions",
      details: err.message 
    });
  }
});
router.get("/:jobId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const jobId = req.params.jobId;
    
    console.log(`[Interview Questions] Fetching for jobId: ${jobId}, userId: ${userId}`);
    
    // 1️⃣ fetch job data
    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      console.log(`[Interview Questions] Job not found`);
      return res.status(404).json({ error: "Job not found" });
    }
    
    console.log(`[Interview Questions] Found job: ${job.jobTitle} at ${job.company}`);
    
    // 2️⃣ Check cache
    let cached = await InterviewQuestions.findOne({ userId, jobId });
    if (cached) {
      console.log(`[Interview Questions] Found cached data`);
      
      // Transform cached data
      const transformedQuestions = transformToFrontendFormat(cached);
      console.log(`[Interview Questions] Transformed questions count:`, transformedQuestions.length);
      
      return res.json({ questions: transformedQuestions });
    }
    
    console.log(`[Interview Questions] No cache found, generating with Gemini...`);
    
    // 3️⃣ Generate Questions via Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(prompt(job));
    
    let rawText = response.response.text();
    let cleaned = rawText.replace(/```json|```/g, "").trim();
    
    let json;
    try {
      json = JSON.parse(cleaned);
      console.log(`[Interview Questions] Parsed JSON successfully`);
    } catch (parseErr) {
      console.error(`[Interview Questions] JSON Parse Error:`, parseErr);
      return res.status(500).json({ 
        error: "Failed to parse AI response",
        details: parseErr.message 
      });
    }
    
    // 4️⃣ Extract and format questions by category
    const allQuestions = json.questions || [];
    
    const technicalQuestions = allQuestions
      .filter(q => q.category === 'technical')
      .map(q => ({ question: q.text }));
    
    const behavioralQuestions = allQuestions
      .filter(q => q.category === 'behavioral')
      .map(q => ({ question: q.text }));
    
    const generalQuestions = allQuestions
      .filter(q => q.category === 'situational')
      .map(q => ({ 
        question: q.text,
        companySpecific: q.companySpecific || false 
      }));
    
    console.log(`[Interview Questions] Extracted: ${technicalQuestions.length} tech, ${behavioralQuestions.length} behavioral, ${generalQuestions.length} general`);
    
    // 5️⃣ Save to database with NEW schema field names
    const savedQuestions = await InterviewQuestions.create({
      userId,
      jobId,
      jobTitle: job.jobTitle,
      company: job.company,
      technicalQuestions,
      behavioralQuestions,
      generalQuestions
    });
    
    console.log(`[Interview Questions] Saved to database`);
    
    // 6️⃣ Transform and return
    const transformedQuestions = transformToFrontendFormat(savedQuestions);
    console.log(`[Interview Questions] Transformed questions count:`, transformedQuestions.length);
    
    res.json({ questions: transformedQuestions });
    
  } catch (err) {
    console.error(`[Interview Questions] Error:`, err);
    res.status(500).json({ 
      error: "Failed to generate questions",
      details: err.message 
    });
  }
});

// Helper function to transform backend format to frontend format
function transformToFrontendFormat(data) {
  const doc = data._doc || data;
  const questions = [];
  
  // Technical questions
  const techQuestions = doc.technicalQuestions || [];
  techQuestions.forEach((q, idx) => {
    questions.push({
      id: `tech_${idx}`,
      text: q.question,
      category: 'technical',
      difficulty: 'mid',
      skills: [],
      companySpecific: false
    });
  });
  
  // Behavioral questions
  const behavioralQuestions = doc.behavioralQuestions || [];
  behavioralQuestions.forEach((q, idx) => {
    questions.push({
      id: `behavioral_${idx}`,
      text: q.question,
      category: 'behavioral',
      difficulty: 'mid',
      skills: [],
      companySpecific: false
    });
  });
  
  // General/Situational questions
  const generalQuestions = doc.generalQuestions || [];
  generalQuestions.forEach((q, idx) => {
    questions.push({
      id: `situational_${idx}`,
      text: q.question,
      category: 'situational',
      difficulty: 'mid',
      skills: [],
      companySpecific: q.companySpecific || false
    });
  });
  
  console.log(`[Transform] Final output:`, questions.length, 'questions');
  return questions;
}

// Add this route to your interviewQuestions.js file
router.post("/analyze", verifyJWT, async (req, res) => {
  try {
    const { question, response } = req.body;
    
    if (!question || !response) {
      return res.status(400).json({ error: "Question and response are required" });
    }
    
    console.log(`[Interview Analysis] Analyzing response for question: ${question.substring(0, 50)}...`);
    
   const prompt = `You are an expert interview coach. Analyze this interview response and provide detailed feedback.

Interview Question: ${question}
Candidate Response: ${response}

Respond ONLY with valid JSON (no markdown). Use exactly this format with REAL values:

{
  "overallScore": 0,
  "relevanceScore": 0,
  "specificityScore": 0,
  "impactScore": 0,
  "starAdherence": {
    "situation": "Yes",
    "task": "Yes",
    "action": "Yes",
    "result": "Yes",
    "feedback": "Your feedback here"
  },
  "wordCount": 0,
  "estimatedTime": "0 minutes 0 seconds",
  "strengths": ["example strength"],
  "weaknesses": ["example weakness"],
  "weakLanguagePatterns": ["example pattern"],
  "suggestions": ["example suggestion"],
  "alternativeApproach": "example alternative approach",
  "overallFeedback": "example summary"
}
`;


    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    
    let rawText = result.response.text();
    let cleaned = rawText.replace(/```json|```/g, "").trim();
    
    let analysis;
    try {
      analysis = JSON.parse(cleaned);
      console.log(`[Interview Analysis] Successfully parsed AI response`);
    } catch (parseErr) {
      console.error(`[Interview Analysis] JSON Parse Error:`, parseErr);
      return res.status(500).json({ 
        error: "Failed to parse AI response",
        details: parseErr.message 
      });
    }
      const savedInsight = await coachinginsights.create({
      userId: req.user._id,
      questionId,
      question,
      response,
      analysis
    });
     console.log(`[Interview Analysis] Insight saved: ${savedInsight._id}`);

    res.json({
      message: "Analysis complete",
      analysis,
      saved: savedInsight
    });
    res.json(analysis);
    
  } catch (err) {
    console.error(`[Interview Analysis] Error:`, err);
    res.status(500).json({ 
      error: "Failed to analyze response",
      details: err.message 
    });
  }
});

export default router;
