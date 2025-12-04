import express from "express";
import InformationalInterview from "../models/InformationalInterview.js";
import Contact from "../models/contacts.js";
import OpenAI from "openai";
import { verifyJWT } from "../middleware/auth.js";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* Helper: Clean AI response JSON safely */
function extractJSON(text) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("AI JSON PARSE ERROR:", text);
    throw new Error("Invalid AI JSON format");
  }
}

/* ============================================================
   1. GET CONTACTS FOR DROPDOWN
============================================================== */
router.get("/candidates", verifyJWT, async (req, res) => {
  try {
    const contacts = await Contact.find({ userid: req.user._id });
    res.json(contacts);
  } catch (err) {
    console.error("CANDIDATES ERROR:", err);
    res.status(500).json({ error: "Failed to load candidates" });
  }
});

/* ============================================================
   2. GENERATE OUTREACH MESSAGE TEMPLATE
============================================================== */
router.post("/generate-request", verifyJWT, async (req, res) => {
  try {
    const { contactName, yourRole, targetIndustry } = req.body;

    const prompt = `
Write a concise informational interview request.
Return ONLY valid JSON with no markdown.

{
  "message": ""
}
Recipient: ${contactName}
Role: ${yourRole}
Industry of Interest: ${targetIndustry}
`;

    const aiRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const parsed = extractJSON(aiRes.output_text);
    res.json(parsed);
  } catch (err) {
    console.error("REQUEST TEMPLATE ERROR:", err);
    res.status(500).json({ error: "Failed to generate outreach template" });
  }
});

/* ============================================================
   3. PREPARATION FRAMEWORK
============================================================== */
router.post("/prep", verifyJWT, async (req, res) => {
  try {
    const { role, industry } = req.body;

    const prompt = `
Provide prep plan for an informational interview.
Return ONLY JSON:
{
  "researchChecklist": [],
  "questionsToAsk": [],
  "conversationFlow": [],
  "personalPitch": ""
}
Role: ${role}
Industry: ${industry}
`;

    const aiRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const parsed = extractJSON(aiRes.output_text);
    res.json(parsed);
  } catch (err) {
    console.error("PREP ERROR:", err);
    res.status(500).json({ error: "Failed to generate prep plan" });
  }
});

/* ============================================================
   4. FOLLOW-UP TEMPLATE
============================================================== */
router.post("/followup", verifyJWT, async (req, res) => {
  try {
    const { contactName } = req.body;

    const prompt = `
Write a thankful follow-up note to ${contactName}.
Return ONLY JSON:
{
  "followUp": ""
}
`;

    const aiRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const parsed = extractJSON(aiRes.output_text);
    res.json(parsed);
  } catch (err) {
    console.error("FOLLOW-UP ERROR:", err);
    res.status(500).json({ error: "Failed to generate follow-up message" });
  }
});

/* ============================================================
   5. CREATE INTERVIEW
============================================================== */
router.post("/", verifyJWT, async (req, res) => {
  try {
    const interview = await InformationalInterview.create({
      userId: req.user._id,
      ...req.body,
    });

    res.json(interview);
  } catch (err) {
    console.error("CREATE INTERVIEW ERROR:", err);
    res.status(500).json({ error: "Failed to create interview" });
  }
});

/* ============================================================
   6. GET ALL USER INTERVIEWS
============================================================== */
router.get("/", verifyJWT, async (req, res) => {
  try {
    const interviews = await InformationalInterview.find({ userId: req.user._id })
      .populate({
        path: "contactId",
        select: "name jobTitle company",
      })
      .lean();

    res.json(interviews);
  } catch (err) {
    console.error("FETCH INTERVIEW ERROR:", err);
    res.status(500).json({ error: "Failed to load interviews" });
  }
});

/* ============================================================
   7. GET SINGLE INTERVIEW
============================================================== */
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const interview = await InformationalInterview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate({
        path: "contactId",
        select: "name jobTitle company",
      })
      .lean();

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.json(interview);
  } catch (err) {
    console.error("FETCH SINGLE INTERVIEW ERROR:", err);
    res.status(500).json({ error: "Failed to load interview" });
  }
});

/* ============================================================
   8. UPDATE INTERVIEW
============================================================== */
router.put("/:id", verifyJWT, async (req, res) => {
  try {
    const updated = await InformationalInterview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update interview" });
  }
});

/* ============================================================
   9. DELETE INTERVIEW
============================================================== */
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    await InformationalInterview.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete interview" });
  }
});

/* ============================================================
   10. GENERATE INSIGHTS
============================================================== */
router.post("/:id/insights", verifyJWT, async (req, res) => {
  try {
    const interview = await InformationalInterview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

   const prompt = `
You are a career advisor. Analyze the informational interview details below and provide a detailed, actionable insights report.

### INTERVIEW DATA:
Contact: ${interview.contactName || "Unknown"}
Company: ${interview.contactCompany || "Unknown"}
Industry: ${interview.industry || "Unknown"}
Role of Interest: ${interview.role || "Unknown"}

Outcomes / What was learned:
${interview.outcomes || "No outcomes provided"}

Impact on job search so far:
${interview.impactOnJobSearch || "No impact provided"}

Follow-Up Message:
${interview.followUpMessage || "No follow-up message yet"}

Preparation Notes (user’s goals or background):
${interview.prepNotes || "None"}

---

### RETURN STRICT JSON ONLY:

{
  "summary": "Clear 3–5 sentence overview of interview value and insights.",
  "connectionQualityScore": 0-100,
  "industryInsights": [
    "At least 3 tailored observations about the industry and contact’s organization."
  ],
  "skillsToDevelop": [
    "A prioritized list of 5+ skills relevant to user's target role."
  ],
  "opportunitiesToPursue": [
    "Specific positions, programs, or areas to research further."
  ],
  "recommendedNextSteps": [
    "3-7 immediate, realistic actions the user should take next."
  ],
  "recommendedFollowUpTimeline": "Concrete timeline to follow up (e.g., 1-2 weeks).",
  "networkingSuggestions": [
    "Suggestions for how to expand network with this connection (e.g., intros)."
  ],
  "peopleOrCompaniesToFollow": [
    "Company or person names discovered through the conversation."
  ]
}
`;


    const aiRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const parsed = extractJSON(aiRes.output_text);

    interview.insightReport = JSON.stringify(parsed);
    await interview.save();

    res.json(parsed);
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

export default router;
