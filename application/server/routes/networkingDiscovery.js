import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import OpenAI from "openai";
import Contact from "../models/contacts.js";
import Job from "../models/jobs.js";
import NetworkingDirectory from "../models/Networking/NetworkingDirectory.model.js";
import NetworkingAnalyticsModel from "../models/Networking/NetworkingAnalytics.model.js";


const router = express.Router();

/* ===========================================================
   INIT OPENAI CLIENT
=========================================================== */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===========================================================
   AI EVENT DISCOVERY
   POST /api/networking/discover-ai
=========================================================== */
router.post("/discover-ai", verifyJWT, async (req, res) => {
  try {
    const { industry, location } = req.body;

    if (!industry || !location) {
      return res.status(400).json({ error: "Missing industry or location" });
    }

    const prompt = `
Generate a list of upcoming networking events for:

Industry: ${industry}
Location: ${location}

Rules:
- Generate 5–8 realistic events.
- Include virtual and in-person events.
- Make dates within the next 60–120 days.
- Output STRICT JSON ONLY:
[
  {
    "title": "",
    "date": "",
    "location": "",
    "venue": "",
    "type": "in-person" | "virtual",
    "description": "",
    "expected_attendance": "",
    "topics": []
  }
]
`;

    const aiRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    // NEW: Extract proper text output
    let raw =
      aiRes.output_text ||
      aiRes.output?.[0]?.content?.[0]?.text || 
      "";

    let jsonString = raw.trim();

    // Fix if wrapped in backticks
    jsonString = jsonString.replace(/```json/i, "").replace(/```/g, "").trim();

    let events;
    try {
      events = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ AI JSON parse error:", jsonString);
      return res.json([]);
    }

    return res.json(events);
  } catch (err) {
    console.error("AI DISCOVERY ERROR:", err);
    return res.status(500).json({ error: "Failed to generate events" });
  }
});

// GET Suggested Contacts with warm intro & interest matching
router.get("/suggestions", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user’s contacts so we don't recommend duplicates
    const connections = await Contact.find({ userid: userId });
    const connectionEmails = connections.map(c => c.email);

    // Fetch user's job data to match recommendations
    const jobs = await Job.find({ userid: userId });
    const companies = [...new Set(jobs.map(j => j.company).filter(Boolean))];
    const roles = [...new Set(jobs.map(j => j.jobTitle).filter(Boolean))];

    // Pull from our pre-seeded suggestion directory
    const suggestions = await NetworkingDirectory.find({
      email: { $nin: connectionEmails }
    }).limit(20);

    const enriched = suggestions.map(s => ({
      ...s._doc,
      match_reason: [
        ...(companies.includes(s.company) ? ["Target Company"] : []),
        ...(roles.includes(s.role) ? ["Similar Role"] : [])
      ]
    }));

    // Track that the user viewed suggestions
    await NetworkingAnalyticsModel.updateOne(
      { userId },
      { $inc: { suggestionsViewed: 1 } },
      { upsert: true }
    );

    res.json({ suggestions: enriched });

  } catch (err) {
    console.error("Networking Discovery Error:", err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

router.post("/track-connect", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    await NetworkingAnalyticsModel.updateOne(
      { userId },
      { $inc: { connectionsAddedFromSuggestions: 1 } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Tracking connect error:", err);
    res.status(500).json({ error: "Failed to track" });
  }
});



export default router;
