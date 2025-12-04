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
import { verifyJWT } from "../middleware/auth.js";
import Referral from "../models/Referral.js";



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
//router.post("/templates/generate", generateReferralTemplate);
router.get("/templates/list", listReferralTemplates);

/* ============================================================
   AI — Core AI Tools
============================================================ */
router.post("/ai/template", generateReferralTemplate);
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

// DELETE a referral
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const removed = await Referral.findOneAndDelete({
      _id: id,
      userId: userId,
    });

    if (!removed) {
      return res.status(404).json({ error: "Referral not found" });
    }

    res.json({ message: "Referral deleted successfully" });
  } catch (err) {
    console.error("Referral delete error:", err);
    res.status(500).json({ error: "Server error deleting referral" });
  }
});


export default router;
