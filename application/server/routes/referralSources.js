import express from "express";
import UserContacts from "../models/contacts.js";
import { OpenAI } from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/referrals/sources/recommend
router.post("/recommend", async (req, res) => {
  const { userId, targetCompany, jobTitle } = req.body;

  try {
    const contacts = await UserContacts.find({ userId });

    if (!contacts || contacts.length === 0) {
      return res.json({ recommendations: [], aiInsights: "" });
    }

    // SCORE CONTACTS
    const scored = contacts.map((c) => {
      let score = 0;

      // Company match
      if (c.company?.toLowerCase() === targetCompany?.toLowerCase()) score += 60;

      // Position relevance
      if (c.position?.toLowerCase().includes(jobTitle?.toLowerCase()))
        score += 20;

      // Relationship
      if (c.relationshipStrength === "strong") score += 15;
      if (c.relationshipStrength === "medium") score += 8;

      // Recency
      if (c.lastInteractionDays < 30) score += 10;
      if (c.lastInteractionDays < 90) score += 5;

      return { ...c._doc, score };
    });

    const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);

    // AI INSIGHTS
    const aiResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `Provide a short explanation of why these people might be the best referral contacts: ${JSON.stringify(
            top
          )}`,
        },
      ],
    });

    res.json({
      recommendations: top,
      aiInsights: aiResp.choices[0].message.content || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating referral sources");
  }
});

export default router;
