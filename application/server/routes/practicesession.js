// routes/practiceSession.js
import express from 'express';
import PracticeSession from '../models/practicesession.js';
import { verifyJWT } from '../middleware/auth.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// Save a completed practice session with rule-based scoring
router.post('/save', verifyJWT, async (req, res) => {
  try {
    const { jobId, jobTitle, company, interviewType, questions, responses, duration } = req.body;
    
    console.log('=== SAVE SESSION DEBUG ===');
    console.log('User ID:', req.user._id);
    console.log('Job ID:', jobId);
    console.log('Questions count:', questions?.length);
    console.log('Responses count:', responses?.length);
    
    if (!jobId || !questions || !responses || questions.length !== responses.length) {
      console.error('Validation failed:', { jobId, questionsLength: questions?.length, responsesLength: responses?.length });
      return res.status(400).json({ error: 'Invalid session data' });
    }

    console.log('Starting to score questions...');
    
    // Score each question-response pair - NO AI, just rule-based
    const scoredQuestions = questions.map((question, index) => {
      const response = responses[index] || ''; // Handle undefined/null responses
      
      // Skip empty responses
      if (!response.trim()) {
        console.log(`Q${index + 1}: Skipped (no response)`);
        return null;
      }
      
      let scoring;
      if (interviewType === "technical") {
        scoring = technicalScoring(response);
      } else {
        scoring = fallbackScoring(response, interviewType);
      }

      const { score, feedback } = scoring;


      console.log(`Scored Q${index + 1}: ${score}/100`);

      return {
        question: question.text || question.question || question.prompt || question,
        response: response,
        aiFeedback: feedback,
        score: score,
        category: question.type
      };
    }).filter(q => q !== null); // Remove null entries for skipped questions
    
    if (scoredQuestions.length === 0) {
      return res.status(400).json({ error: 'No valid responses to save' });
    }

    console.log('All questions scored. Calculating average...');
    const averageScore = scoredQuestions.reduce((sum, q) => sum + q.score, 0) / scoredQuestions.length;
    console.log('Average score:', averageScore);

    console.log('Creating session document...');
    const session = new PracticeSession({
      userId: req.user._id,
      jobId,
      title: `${interviewType} Interview - ${jobTitle} @ ${company}`,
      duration,
      completed: true,
      questions: scoredQuestions,
      averageScore: Math.round(averageScore),
      totalQuestions: questions.length
    });

    console.log('Saving to database...');
    await session.save();
    console.log('Session saved successfully!');

    res.status(201).json({
      sessionId: session._id,
      averageScore: session.averageScore,
      questions: scoredQuestions
    });

  } catch (error) {
    console.error('!!! ERROR SAVING PRACTICE SESSION !!!');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save session',
      details: error.message,
      type: error.name
    });
  }
});

// Enhanced rule-based scoring (no AI needed!)
function fallbackScoring(response, interviewType = 'behavioral') {
  const trimmed = response.trim();
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  let score = 60; // base score
  let feedback = [];
  
  // === LENGTH SCORING ===
  // Behavioral: 75-150 words ideal
  // Technical: 50-120 words ideal
  const idealMin = interviewType === 'behavioral' ? 75 : 50;
  const idealMax = interviewType === 'behavioral' ? 150 : 120;
  
  if (wordCount < 30) {
    score -= 25;
    feedback.push("Response is too brief - add specific examples and more detail");
  } else if (wordCount < idealMin) {
    score -= 10;
    feedback.push("Good start, but expand with more specific details");
  } else if (wordCount >= idealMin && wordCount <= idealMax) {
    score += 20; // Sweet spot!
  } else if (wordCount > idealMax * 2) {
    score -= 15;
    feedback.push("Response is too long - practice being more concise");
  } else if (wordCount > idealMax) {
    score -= 5;
    feedback.push("Slightly lengthy - try to be more concise");
  }
  
  // === STRUCTURE INDICATORS ===
  const hasStructure = /\b(first|second|third|then|next|finally|additionally|furthermore|moreover)\b/i.test(trimmed);
  const hasSTAR = /\b(situation|task|action|result|challenge|problem|solution)\b/i.test(trimmed);
  
  if (hasStructure) {
    score += 10;
    feedback.push("Good use of structure");
  }
  
  if (interviewType === 'behavioral' && hasSTAR) {
    score += 10;
    feedback.push("Nice use of STAR method elements");
  }
  
  // === EXAMPLE/SPECIFICITY INDICATORS ===
  const hasExample = /\b(for example|for instance|specifically|such as|in my role|when I|at my|during my)\b/i.test(trimmed);
  const hasMetrics = /\d+(%|percent|users|customers|hours|days|weeks|months|dollars|\$)/.test(trimmed);
  
  if (hasExample) {
    score += 12;
  } else if (interviewType === 'behavioral') {
    feedback.push("Add a specific example from your experience");
  }
  
  if (hasMetrics) {
    score += 8;
    feedback.push("Excellent use of quantifiable results");
  }
  
  // === PROFESSIONALISM CHECKS ===
  const hasProfessionalWords = /\b(developed|implemented|achieved|improved|collaborated|managed|led|analyzed|designed|created)\b/i.test(trimmed);
  const hasFillerWords = /\b(um|uh|like|you know|basically|actually|literally)\b/i.test(trimmed);
  
  if (hasProfessionalWords) {
    score += 8;
  }
  
  if (hasFillerWords) {
    score -= 5;
    feedback.push("Avoid filler words for more professional communication");
  }
  
  // === SENTENCE QUALITY ===
  if (sentenceCount >= 3 && sentenceCount <= 8) {
    score += 5; // Good variety
  } else if (sentenceCount < 2) {
    feedback.push("Break your response into multiple sentences");
  } else if (sentenceCount > 12) {
    feedback.push("Consider combining some sentences for better flow");
  }
  
  // Check for complete sentences
  const endsProperlyCount = (trimmed.match(/[.!?]$/g) || []).length;
  if (endsProperlyCount > 0) {
    score += 5;
  }
  
  // === TECHNICAL-SPECIFIC CHECKS ===
  if (interviewType === 'technical') {
    const hasTechnicalTerms = /\b(algorithm|complexity|O\(|data structure|function|class|method|API|database|query|time|space)\b/i.test(trimmed);
    const hasCodeExample = /\b(code|function|method|loop|array|object|string|return)\b/i.test(trimmed);
    
    if (hasTechnicalTerms) {
      score += 10;
    } else {
      feedback.push("Include relevant technical terminology");
    }
    
    if (hasCodeExample) {
      score += 5;
    }
  }
  
  // === FINAL ADJUSTMENTS ===
  // Cap score
  score = Math.min(100, Math.max(0, score));
  
  // Generate final feedback
  let finalFeedback = "";
  
  if (score >= 85) {
    finalFeedback = "Excellent response! " + (feedback[0] || "Well structured with good detail.");
  } else if (score >= 70) {
    finalFeedback = "Good response. " + (feedback.find(f => f.includes("add") || f.includes("try")) || feedback[0] || "Keep practicing for even better answers.");
  } else if (score >= 50) {
    finalFeedback = "Decent response. " + (feedback.find(f => f.includes("add") || f.includes("expand")) || "Add more specific examples and details.");
  } else {
    finalFeedback = "Needs improvement. " + (feedback[0] || "Provide more detailed, structured answers with specific examples.");
  }
  
  return {
    score: Math.round(score),
    feedback: finalFeedback
  };
}

// === TECHNICAL SCORING (for coding + algorithm questions) ===
function technicalScoring(response) {
  const trimmed = response.trim();
  const wordCount = trimmed.split(/\s+/).length;

  let score = 50; // base default
  const feedback = [];

  // --- Detect Pseudocode or Code Blocks ---
  const hasCode = /[{()}]|function|def |class |return|=>|\bfor\b|\bwhile\b/.test(trimmed);
  const hasPseudo = /\b(if|else|loop|until|repeat|step|compute|initialize)\b/i.test(trimmed);

  if (hasCode) {
    score += 20;
    feedback.push("Good use of code-like structure.");
  } else if (hasPseudo) {
    score += 15;
    feedback.push("Good pseudocode representation.");
  } else {
    feedback.push("Try including pseudocode or a step-by-step algorithm.");
  }

  // --- Algorithm Terminology ---
  const hasAlgoTerms = /\b(O\(|complexity|binary search|hash|stack|queue|tree|graph|DP|dynamic programming)\b/i.test(trimmed);

  if (hasAlgoTerms) {
    score += 15;
    feedback.push("Strong algorithmic terminology.");
  } else {
    feedback.push("Include algorithmic terms or complexity analysis.");
  }

  // --- Problem-Solving Structure ---
  const hasSteps = /\b(step 1|first|second|finally|then|next)\b/i.test(trimmed);
  if (hasSteps) {
    score += 10;
    feedback.push("Clear step-by-step explanation.");
  }

  // --- Edge Cases Mention ---
  const mentionsEdgeCases = /\bedge case|null|empty|invalid|overflow|boundary/i.test(trimmed);
  if (mentionsEdgeCases) {
    score += 10;
    feedback.push("Good mention of edge cases.");
  } else {
    feedback.push("Try mentioning edge cases.");
  }

  // --- Time/Space Complexity ---
  if (/O\(.+\)/.test(trimmed)) {
    score += 10;
    feedback.push("Complexity analysis included.");
  } else {
    feedback.push("Add time/space complexity if relevant.");
  }

  // --- Length Check ---
  if (wordCount < 30) {
    score -= 10;
    feedback.push("Too short—expand explanation.");
  }

  score = Math.min(100, Math.max(0, score));

  const finalFeedback =
    score >= 85
      ? "Excellent technical explanation. " + feedback.join(" ")
      : score >= 70
      ? "Good answer. " + feedback.join(" ")
      : "Needs stronger technical depth. " + feedback.join(" ");

  return { score, feedback: finalFeedback };
}


// Get user's practice sessions
router.get('/sessions', verifyJWT, async (req, res) => {
  try {
    const sessions = await PracticeSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get specific session details
router.get('/sessions/:id', verifyJWT, async (req, res) => {
  try {
    const session = await PracticeSession.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.post("/generate-technical", async (req, res) => {
  try {
    const { jobTitle, skills, seniority } = req.body;

    const prompt = `
Generate 3–5 technical interview questions based on:

Job Title: ${jobTitle}
Skills: ${skills.join(", ")}
Seniority: ${seniority}

Return JSON with:
[
  {
    "type": "coding" | "system-design" | "case-study",
    "difficulty": "easy|medium|hard",
    "question": "text here"
  }
]
If seniority includes "senior", include at least one system design question.
If skills include business/analysis/consulting, include a case study.
    `;

    const aiResponse = await gemini.generate(prompt);
    const questions = JSON.parse(aiResponse);

    res.json({ questions });

  } catch (err) {
    console.error("TECHNICAL GENERATE ERROR:", err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// Generate coding challenge based on job skills
router.post('/generate-coding-challenge', verifyJWT, async (req, res) => {
  const { skills = [] } = req.body;

  // Basic mapping (expand anytime)
  const skillMap = {
    javascript: [
      "Implement a function to debounce another function.",
      "Create a deep clone function for nested objects.",
      "Implement a custom Promise.all."
    ],
    python: [
      "Implement an LRU Cache.",
      "Detect cycles in a linked list.",
      "Build a simple rate limiter."
    ],
    java: [
      "Implement a thread-safe Singleton.",
      "Design a min-stack with O(1) operations."
    ],
    sql: [
      "Write a query to find customers who made purchases every month this year.",
      "Get the top 3 most purchased products by total revenue."
    ]
  };

  let questions = [];

  skills.forEach(skill => {
    const list = skillMap[skill.toLowerCase()];
    if (list) {
      questions.push(...list);
    }
  });

  if (questions.length === 0) {
    questions = [
      "Implement a function to reverse a linked list.",
      "Determine if a string is a valid palindrome ignoring non-alphanumeric characters."
    ];
  }

  res.json({
    questions,
    count: questions.length
  });
});
router.post('/generate-coding-challenges', verifyJWT, async (req, res) => {
    try {
      const { jobTitle, company, jobDescription } = req.body;

      const prompt = `You are an expert technical interviewer. Generate 3 coding challenges for this position:

  Job Title: ${jobTitle}
  Company: ${company}
  Job Description: ${jobDescription}

  Based on the job requirements and skills mentioned, create relevant coding challenges.

  Return ONLY valid JSON (no markdown, no backticks) in this exact format:
  [
    {
      "title": "Challenge Title",
      "type": "Array/String/Tree/etc",
      "difficulty": "Easy/Medium/Hard",
      "prompt": "Full problem description here",
      "targetLines": 10,
      "guidance": "Helpful hint for solving"
    }
  ]

  Make challenges relevant to the skills and requirements in the job description.`;

      const result = await gemini.generateContent(prompt);
      let rawText = result.response.text();
      let cleaned = rawText.replace(/```json|```/g, "").trim();
      
      const challenges = JSON.parse(cleaned);
      
      res.json({ challenges });

    } catch (err) {
      console.error("CODING CHALLENGE GENERATION ERROR:", err);
      res.status(500).json({ 
        error: "Failed to generate coding challenges",
        details: err.message 
      });
    }
});

router.post('/submit-coding', verifyJWT, async (req, res) => {
  const { question, solution } = req.body;

  if (!question || !solution) {
    return res.status(400).json({ error: "Missing data" });
  }

  const scoring = technicalScoring(solution);

  res.json({
    question,
    solution,
    score: scoring.score,
    feedback: scoring.feedback
  });
});

export default router;