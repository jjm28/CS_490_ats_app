import express from "express";
const router = express.Router();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyJWT } from "../middleware/auth.js"; 
import Job from "../models/jobs.js";
import InterviewInsights from "../models/interviewInsights.js";
import { logApiCall } from "../middleware/apiLogger.js"; // ← ADD THIS

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

// GET /:jobId - WITH LOGGING
router.get("/:jobId", async (req, res) => {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    console.log("✅ interview-insights route hit");
    const userId = req.user?._id;
    if (!userId) {
      console.log("❌ No user ID found");
      return res.status(401).json({ error: "Not logged in" });
    }

    const { jobId } = req.params;
    console.log(`🔍 Fetching insights for job: ${jobId}`);

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

    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job not found for this user" });
    }

    const { jobTitle, company } = job;
    console.log(`🎯 Generating NEW insights for: ${jobTitle} at ${company}`);

    const insights = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2096,
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

      let cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      let parsedInsights;
      try {
        parsedInsights = JSON.parse(cleaned);
        console.log("✅ Successfully parsed JSON");
        
        const cleanMarkdown = (text) => {
          if (typeof text !== 'string') return text;
          return text.replace(/\*\*/g, '').replace(/\*/g, '');
        };
        
        if (parsedInsights.interviewFormat) {
          parsedInsights.interviewFormat = cleanMarkdown(parsedInsights.interviewFormat);
        }
        if (parsedInsights.timeline) {
          parsedInsights.timeline = cleanMarkdown(parsedInsights.timeline);
        }
        if (parsedInsights.interviewerInfo) {
          parsedInsights.interviewerInfo = cleanMarkdown(parsedInsights.interviewerInfo);
        }
        
        if (Array.isArray(parsedInsights.processStages)) {
          parsedInsights.processStages = parsedInsights.processStages.map(cleanMarkdown);
        }
        if (Array.isArray(parsedInsights.commonQuestions)) {
          parsedInsights.commonQuestions = parsedInsights.commonQuestions.map(cleanMarkdown);
        }
        if (Array.isArray(parsedInsights.preparationTips)) {
          parsedInsights.preparationTips = parsedInsights.preparationTips.map(cleanMarkdown);
        }
        if (Array.isArray(parsedInsights.successTips)) {
          parsedInsights.successTips = parsedInsights.successTips.map(cleanMarkdown);
        }
        
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON:", parseErr);
        throw new Error("Failed to parse AI response");
      }

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

    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

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
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error("🔥 FULL ERROR:", err);
    
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

router.get("/queue/status", (req, res) => {
  res.json({
    queueLength: geminiQueue.queue.length,
    processing: geminiQueue.processing,
    estimatedWaitTime: geminiQueue.queue.length * 2
  });
});

// POST /evaluate-session - WITH LOGGING
router.post("/evaluate-session", async (req, res) => {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const userId = req.user?._id;
    const { jobId, responses } = req.body;

    if (!userId || !jobId || !Array.isArray(responses)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const result = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: { temperature: 0.6, maxOutputTokens: 1500 }
      });

      const qaText = responses.map((r, i) => 
        `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.response}`
      ).join("\n\n");

      const prompt = `
        Role: Expert interview coach
        Job: ${job.jobTitle} at ${job.company || "a top company"}
        Evaluate this mock interview session:

        ${qaText}

        Respond in JSON only:
        {
          "overallScore": 85,
          "summary": "Brief overall comment",
          "questionFeedback": [
            { "question": "...", "score": 90, "feedback": "..." }
          ]
        }
      `;

      const response = await model.generateContent(prompt);
      let raw = response.response.text().replace(/```json|```/g, "").trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    });

    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    await Promise.all(
      result.questionFeedback.map((fb, idx) =>
        InterviewPrep.create({
          userId,
          jobId,
          question: responses[idx].question,
          response: responses[idx].response,
          aiFeedback: fb.feedback,
          score: fb.score
        })
      )
    );

    res.json(result);
  } catch (err) {
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate session" });
  }
});

// POST /generate-questions - WITH LOGGING
router.post("/generate-questions", async (req, res) => {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const { jobTitle, company, type } = req.body;
    
    if (!jobTitle) {
      return res.status(400).json({ error: "Job title required" });
    }

    const result = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: { temperature: 0.6, maxOutputTokens: 1500 }
      });

      let prompt;
      
      if (type === 'technical') {
        prompt = `Generate exactly 5 technical situational interview questions for a ${jobTitle} position at ${company || "a company"}.

Requirements:
- Each question should ask the candidate to EXPLAIN or DESCRIBE a technical concept, approach, or design
- Focus on: system design, architecture, databases, APIs, algorithms, data structures, scalability, trade-offs
- Questions should test understanding and reasoning, NOT coding ability
- Keep questions clear and concise
- Return ONLY a JSON array, no other text
- Format: ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]

Examples of good technical situational questions:
- "Explain the difference between SQL and NoSQL databases. When would you use each?"
- "How would you design a URL shortening service like bit.ly?"
- "Describe how you would implement caching in a web application. What strategies would you use?"
- "What are the trade-offs between microservices and monolithic architecture?"`;
      } else {
        prompt = `Generate exactly 10 behavioral interview questions for a ${jobTitle} position at ${company || "a company"}.

Requirements:
- Each question must be behavioral (asking about past experiences, situations, or approach)
- Questions should be relevant to the ${jobTitle} role
- Vary the question types (teamwork, leadership, conflict, problem-solving, adaptability, etc.)
- Keep questions clear and concise
- Return ONLY a JSON array, no other text
- Format: ["Question 1", "Question 2", "Question 3"]`;
      }

      const response = await model.generateContent(prompt);
      let raw = response.response.text();
      
      raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const arrayMatch = raw.match(/\[([\s\S]*)\]/);
      if (!arrayMatch) {
        throw new Error('No JSON array found in response');
      }
      
      const questions = JSON.parse(arrayMatch[0]);
      
      const expectedCount = type === 'technical' ? 5 : 10;
      if (!Array.isArray(questions) || questions.length < expectedCount) {
        throw new Error(`Insufficient questions generated. Expected ${expectedCount}, got ${questions.length}`);
      }
      
      return questions.slice(0, expectedCount);
    });

    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    res.json({ questions: result });
  } catch (err) {
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error("Question generation error:", err);
    res.status(500).json({ 
      error: "Failed to generate questions",
      details: err.message 
    });
  }
});

// POST /analyze-response - WITH LOGGING
router.post("/analyze-response", verifyJWT, async (req, res) => {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { question, response, category, jobTitle, company } = req.body;

    if (!question || !response || !category) {
      return res.status(400).json({ 
        error: "Missing required fields: question, response, category" 
      });
    }

    console.log(`[Writing Analysis] Analyzing ${category} response for ${jobTitle || 'position'}`);

    const wordCount = response.trim().split(/\s+/).filter(w => w.length > 0).length;
    const hasSTARKeywords = /\b(situation|task|action|result|challenge|problem|solution)\b/i.test(response);

    const analysisPrompt = generateAnalysisPrompt(question, response, category, jobTitle, company);

    const analysis = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1500
        }
      });

      const result = await model.generateContent(analysisPrompt);
      let rawText = result.response.text();
      
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    });

    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    if (!analysis.overallScore || !analysis.feedback) {
      throw new Error('Invalid analysis format from AI');
    }

    const analysisResult = {
      overallScore: Math.min(100, Math.max(0, analysis.overallScore)),
      structureScore: analysis.structureScore || null,
      clarityScore: analysis.clarityScore || null,
      storytellingScore: analysis.storytellingScore || null,
      
      feedback: analysis.feedback,
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      
      wordCount,
      hasSTARElements: category === 'behavioral' ? hasSTARKeywords : null,
      analyzedAt: new Date()
    };

    console.log(`[Writing Analysis] Score: ${analysisResult.overallScore}/100`);

    res.json(analysisResult);

  } catch (err) {
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error('[Writing Analysis] Error:', err);
    
    if (err.message?.includes("429") || err.message?.includes("quota")) {
      return res.status(429).json({
        error: "API rate limit reached. Please try again in a few moments.",
        retryAfter: 60
      });
    }

    res.status(500).json({
      error: "Failed to analyze response",
      details: err.message || "Unknown error"
    });
  }
});

// POST /generate-virtual-tips - WITH LOGGING
router.post("/generate-virtual-tips", verifyJWT, async (req, res) => {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { jobTitle, company, interviewType } = req.body;

    if (!jobTitle) {
      return res.status(400).json({ error: "Job title is required" });
    }

    console.log(`[Virtual Tips] Generating for ${jobTitle} at ${company || 'company'}`);

    const tips = await geminiQueue.add(async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      });

      const prompt = `Generate virtual/remote interview tips for a ${jobTitle} position at ${company || 'a company'}.

Interview Type: ${interviewType || 'Video interview (Zoom/Teams)'}

Provide practical, actionable tips in the following categories:
1. Technical Setup (camera, lighting, background, audio)
2. Professional Presence (eye contact, body language, attire)
3. Communication Best Practices (speaking pace, clarity, engagement)
4. Common Pitfalls to Avoid
5. Pre-Interview Checklist

Respond in JSON format ONLY:
{
  "technicalSetup": ["tip 1", "tip 2", "tip 3"],
  "professionalPresence": ["tip 1", "tip 2", "tip 3"],
  "communicationBestPractices": ["tip 1", "tip 2", "tip 3"],
  "commonPitfalls": ["pitfall 1", "pitfall 2", "pitfall 3"],
  "preInterviewChecklist": ["checklist item 1", "checklist item 2", "checklist item 3"]
}

Make tips specific to the role when relevant.`;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text();
      
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    });

    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    console.log('[Virtual Tips] Generated successfully');

    res.json({
      tips,
      generatedFor: {
        jobTitle,
        company,
        interviewType
      },
      generatedAt: new Date()
    });

  } catch (err) {
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error('[Virtual Tips] Error:', err);
    
    if (err.message?.includes("429") || err.message?.includes("quota")) {
      return res.status(429).json({
        error: "API rate limit reached. Please try again in a few moments.",
        retryAfter: 60
      });
    }

    const fallbackTips = {
      technicalSetup: [
        "Test your camera, microphone, and internet connection 30 minutes before",
        "Position camera at eye level with good lighting from the front",
        "Use a neutral, clutter-free background or virtual background",
        "Close unnecessary applications to prevent notifications"
      ],
      professionalPresence: [
        "Dress professionally from head to toe (you might need to stand up)",
        "Look at the camera when speaking to simulate eye contact",
        "Sit up straight with good posture throughout the interview",
        "Use natural hand gestures but keep them in frame"
      ],
      communicationBestPractices: [
        "Speak slightly slower than normal to account for audio lag",
        "Pause after answering to give the interviewer time to respond",
        "Use the chat feature to share links or clarify spellings if needed",
        "Smile and nod to show engagement even when not speaking"
      ],
      commonPitfalls: [
        "Avoid looking at yourself on screen - focus on the camera or interviewer",
        "Don't interrupt - video lag can make this awkward",
        "Mute when not speaking to avoid background noise",
        "Don't read directly from notes - it's obvious on video"
      ],
      preInterviewChecklist: [
        "Join the call 5 minutes early to handle any technical issues",
        "Have the job description and your resume visible on second screen",
        "Keep water nearby (out of frame)",
        "Test screen sharing if you'll need to demonstrate anything"
      ]
    };

    res.json({
      tips: fallbackTips,
      generatedFor: {
        jobTitle: req.body.jobTitle,
        company: req.body.company,
        interviewType: req.body.interviewType
      },
      generatedAt: new Date(),
      fallback: true
    });
  }
});

function generateAnalysisPrompt(question, response, category, jobTitle, company) {
  const baseContext = `You are an expert interview coach analyzing a written interview response.

Position: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}
Question Category: ${category}

Question: "${question}"

Candidate's Response: "${response}"

`;

  const categoryGuidelines = {
    behavioral: `
BEHAVIORAL RESPONSE EVALUATION:
- STAR Method: Does it include Situation, Task, Action, Result?
- Specificity: Are there concrete examples and metrics?
- Relevance: Does it directly answer the question?
- Professionalism: Is the language appropriate and confident?

Score on:
1. Structure (STAR adherence, logical flow)
2. Clarity (conciseness, easy to follow)
3. Storytelling (engagement, specificity, impact)
`,
    technical: `
TECHNICAL RESPONSE EVALUATION:
- Problem Understanding: Does it show clear comprehension?
- Approach: Is the solution logical and well-explained?
- Technical Accuracy: Are concepts/terms used correctly?
- Communication: Can a non-technical person follow the logic?

Score on:
1. Structure (problem → approach → solution flow)
2. Clarity (technical communication, avoiding jargon when unnecessary)
3. Storytelling (explaining the "why" behind decisions, showing thought process)
`,
    situational: `
SITUATIONAL RESPONSE EVALUATION:
- Scenario Understanding: Does it address the hypothetical situation?
- Critical Thinking: Is there thoughtful analysis of trade-offs?
- Action Plan: Is there a clear approach to handling the situation?
- Professionalism: Does it show maturity and good judgment?

Score on:
1. Structure (situation analysis → approach → outcomes)
2. Clarity (clear reasoning, logical steps)
3. Storytelling (demonstrating thought process, anticipating consequences)
`
  };

  const promptTemplate = baseContext + categoryGuidelines[category] + `

RESPOND IN JSON FORMAT ONLY:
{
  "overallScore": 85,
  "structureScore": 90,
  "clarityScore": 85,
  "storytellingScore": 80,
  "feedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}

SCORING GUIDELINES:
- 90-100: Exceptional, ready for top-tier interviews
- 80-89: Strong, minor refinements needed
- 70-79: Good foundation, some improvements needed
- 60-69: Adequate, significant improvements needed
- Below 60: Needs substantial work

Be constructive and specific. Focus on actionable improvements.`;

  return promptTemplate;
}

export { generateAnalysisPrompt };
export default router;