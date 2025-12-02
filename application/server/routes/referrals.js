import express from "express";
import {
  createReferralRequest,
  getReferralsList,
  updateReferralStatus,
  addFollowUp,
  addGratitude,
  getReferralTimeline,
  generateReferralSources,
  generateReferralTemplate,
  listReferralTemplates,
  generateEtiquetteGuidance,
  generateTimingSuggestions,
  recommendReferralSources,   // ✅ <-- NEW controller import
  //generatePersonalizationTips  // OPTIONAL if you implement separately
} from "../controllers/referralsController.js";

const router = express.Router();

/* ============================================================
   REFERRAL CRUD
============================================================ */
router.post("/request", createReferralRequest);
router.get("/list", getReferralsList);
router.patch("/status/:id", updateReferralStatus);
router.post("/followup/:id", addFollowUp);
router.post("/gratitude/:id", addGratitude);
router.get("/timeline/:id", getReferralTimeline);

/* ============================================================
   REFERRAL TEMPLATES
============================================================ */
router.post("/templates/generate", generateReferralTemplate);
router.get("/templates/list", listReferralTemplates);

/* ============================================================
   AI — Core AI Tools
============================================================ */
router.post("/ai/etiquette", generateEtiquetteGuidance);
router.post("/ai/timing", generateTimingSuggestions);

/* ============================================================
   AI — Personalization Tips
============================================================ */
router.post("/ai/personalization", async (req, res) => {
  try {
    const { jobTitle, relationship } = req.body;

    if (!jobTitle || !relationship) {
      return res.status(400).json({
        error: "jobTitle and relationship are required fields",
      });
    }

    const tips = await generatePersonalizationTips({
      jobTitle,
      relationship,
    });

    return res.json({ success: true, tips });
  } catch (err) {
    console.error("Personalization AI Error:", err);
    return res.status(500).json({
      error: "Failed to generate personalization insights",
    });
  }
});

/* ============================================================
   AI — Referral Source Recommendations (FIXED)
============================================================ */
router.post("/sources/generate", generateReferralSources);

// ✅ Correct controller-based route
router.post("/sources/recommend", recommendReferralSources);

export default router;
