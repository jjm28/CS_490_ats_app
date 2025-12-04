import Referral from "../models/Referral.js";
import ReferralLog from "../models/ReferralLog.js";
import ReferralTemplate from "../models/ReferralTemplate.js";
import Job from "../models/jobs.js";

import {
  identifyReferralSourcesAI,
  generateReferralTemplateAI,
  etiquetteGuidanceAI,
  timingSuggestionsAI,
  scoreRelationshipAI,
  scoreSuccessRateAI,
  scoreReferralSourcesAI
} from "../services/referralAIService.js";

/* ============================================================
   CREATE REFERRAL REQUEST  —  OPTIMIZED (INSTANT)
============================================================ */
export const createReferralRequest = async (req, res) => {
  try {
    const {
      userId,
      jobId,
      referrerName,
      referrerEmail,
      relationship,
      requestMessage,
    } = req.body;

    // Fetch job title
    const job = await Job.findById(jobId);
    const jobTitle = job?.jobTitle || "Unknown Role";

    /* ------------------------------------------------------------
       1. Create referral IMMEDIATELY (fast!)
    ------------------------------------------------------------ */
    const referral = await Referral.create({
      userId,
      jobId,
      referrerName,
      referrerEmail,
      relationship,
      requestMessage,
      status: "pending",
      dateRequested: new Date(),

      // temporary placeholders – AI fills them later
      relationshipStrength: null,
      successRate: null,
    });

    // Log the creation
    await ReferralLog.create({
      referralId: referral._id,
      eventType: "requested",
      eventDetails: `Referral request created for ${jobTitle}`,
      meta: {},
    });

    /* ------------------------------------------------------------
       2. Trigger AI scoring IN THE BACKGROUND
       (this will NOT slow down the request)
    ------------------------------------------------------------ */
    setTimeout(async () => {
      try {
        const [relationshipStrength, successRate] = await Promise.all([
          scoreRelationshipAI({ relationship }),
          scoreSuccessRateAI({ jobTitle, relationship }),
        ]);

        await Referral.findByIdAndUpdate(referral._id, {
          relationshipStrength,
          successRate,
        });

        await ReferralLog.create({
          referralId: referral._id,
          eventType: "scoring_complete",
          eventDetails: "AI scoring completed",
          meta: { relationshipStrength, successRate },
        });

      } catch (bgErr) {
        console.error("Background AI scoring failed:", bgErr);
      }
    }, 50); // small delay to avoid blocking the response

    /* ------------------------------------------------------------
       3. Return response IMMEDIATELY
    ------------------------------------------------------------ */
    return res.json({
      success: true,
      referral,
      message: "Referral created — AI scoring running in background.",
    });

  } catch (error) {
    console.error("Referral Request Error:", error);
    return res.status(500).json({ error: "Failed to create referral request" });
  }
};

/* ============================================================
   LIST REFERRALS
============================================================ */
export const getReferralsList = async (req, res) => {
  try {
    const { userId } = req.query;
    const referrals = await Referral.find({ userId }).sort({ createdAt: -1 });

    return res.json({ success: true, referrals });
  } catch (error) {
    console.error("Get Referral List Error:", error);
    return res.status(500).json({ error: "Failed to get referrals" });
  }
};

/* ============================================================
   UPDATE STATUS
============================================================ */
export const updateReferralStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, outcome } = req.body;

    const old = await Referral.findById(id);

    const updated = await Referral.findByIdAndUpdate(
      id,
      { status, outcome },
      { new: true }
    );

    await ReferralLog.create({
      referralId: id,
      eventType: "status",
      eventDetails: `Status changed: ${old.status} → ${status}`,
      meta: { oldStatus: old.status, newStatus: status, outcome },
    });

    return res.json({ success: true, updated });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(500).json({ error: "Failed to update referral status" });
  }
};

/* ============================================================
   ADD FOLLOW-UP
============================================================ */
export const addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, nextFollowUp } = req.body;

    await ReferralLog.create({
      referralId: id,
      eventType: "followup",
      eventDetails: message,
      meta: { nextFollowUp },
    });

    const updated = await Referral.findByIdAndUpdate(
      id,
      { nextFollowUp },
      { new: true }
    );

    return res.json({ success: true, updated });
  } catch (error) {
    console.error("Follow-up Error:", error);
    return res.status(500).json({ error: "Failed to add follow-up" });
  }
};

/* ============================================================
   ADD GRATITUDE
============================================================ */
export const addGratitude = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    await ReferralLog.create({
      referralId: id,
      eventType: "gratitude",
      eventDetails: message,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Gratitude Error:", error);
    return res.status(500).json({ error: "Failed to add gratitude" });
  }
};

/* ============================================================
   TIMELINE
============================================================ */
export const getReferralTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await ReferralLog.find({ referralId: id }).sort({
      createdAt: 1,
    });

    return res.json({ success: true, logs });
  } catch (error) {
    console.error("Timeline Error:", error);
    return res.status(500).json({ error: "Failed to get timeline" });
  }
};

/* ============================================================
   AI: REFERRAL SOURCES
============================================================ */
export const generateReferralSources = async (req, res) => {
  try {
    const results = await identifyReferralSourcesAI(req.body.jobTitle);

    return res.json({ success: true, sources: results });
  } catch (error) {
    console.error("Referral Sources Error:", error);
    return res.status(500).json({ error: "Failed to generate referral sources" });
  }
};

/* ============================================================
   AI: TEMPLATE GENERATION
============================================================ */
export const generateReferralTemplate = async (req, res) => {
  try {
    const template = await generateReferralTemplateAI(req.body);
    console.log("Incoming Referral AI Request:", req.body);
    return res.json({ success: true, template });
  } catch (error) {
    console.error("Template Error:", error);
    return res.status(500).json({ error: "Failed to generate template" });
  }
};

/* ============================================================
   LIST SAVED TEMPLATES
============================================================ */
export const listReferralTemplates = async (req, res) => {
  try {
    const { userId } = req.query;
    const templates = await ReferralTemplate.find({ userId });
    return res.json({ success: true, templates });
  } catch (error) {
    console.error("List Templates Error:", error);
    return res.status(500).json({ error: "Failed to list templates" });
  }
};

/* ============================================================
   AI: ETIQUETTE TIPS
============================================================ */
export const generateEtiquetteGuidance = async (req, res) => {
  try {
    const guidance = await etiquetteGuidanceAI();
    return res.json({ success: true, guidance });
  } catch (error) {
    console.error("Etiquette Error:", error);
    return res.status(500).json({ error: "Failed to load etiquette guidance" });
  }
};

/* ============================================================
   AI: TIMING RECOMMENDATIONS
============================================================ */
export const generateTimingSuggestions = async (req, res) => {
  try {
    const timing = await timingSuggestionsAI(req.body.jobTitle || "General");
    return res.json({ success: true, timing });
  } catch (error) {
    console.error("Timing Error:", error);
    return res.status(500).json({ error: "Failed to load timing suggestions" });
  }
};

/* ============================================================
   AI: COMPANY + ROLE SPECIFIC REFERRAL SOURCE FINDER
============================================================ */
export const recommendReferralSources = async (req, res) => {
  try {
    const { jobTitle, targetCompany } = req.body;

    if (!jobTitle || !targetCompany) {
      return res.status(400).json({
        error: "jobTitle and targetCompany are required",
      });
    }

    const aiOutput = await scoreReferralSourcesAI({ jobTitle, targetCompany });

    const normalized = aiOutput.map(item => ({
      name: item.name || "Unknown",
      reason:
        item.reason ||
        item.why_good_fit ||
        "Recommended based on company-role alignment.",
    }));

    return res.json({
      success: true,
      sources: normalized,
    });
  } catch (error) {
    console.error("Recommend Referral Sources Error:", error);
    return res.status(500).json({
      error: "Failed to load recommended referral sources",
    });
  }
};
