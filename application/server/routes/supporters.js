// routes/supporters.routes.js
import express from "express";
import {
  listSupporters,
  inviteSupporter,
  updateSupporter,
  acceptInviteByToken,
    getSupporterSummary,  createWellbeingCheckin,
    getWellbeingSnapshot,
  getRecentCheckins,acceptInviteForUser,listSupportedPeople, createMilestone,createSupportUpdate ,getWellbeingSupportOverview,
  saveWellbeingResetPlan,
} from "../services/supporters.service.js";
import WellbeingCheckin from "../models/support/WellbeingCheckin.js";

const router = express.Router();

/**
 * GET /api/supporters?userId=...
 * List supporters for a job seeker.
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const supporters = await listSupporters({ ownerUserId: userId });
    res.json(supporters);
  } catch (err) {
    console.error("Error listing supporters:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error listing supporters" });
  }
});

/**
 * POST /api/supporters/invite?userId=...
 * Body: { fullName, email, relationship?, presetKey? }
 */
router.post("/invite", async (req, res) => {
  try {
    const { userId } = req.query;
    const { fullName, email, relationship, presetKey } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!fullName || !email) {
      return res
        .status(400)
        .json({ error: "fullName and email are required" });
    }

    const supporter = await inviteSupporter({
    ownerUserId: userId,
    fullName,
    email,
    relationship,
    presetKey,
  });

    res.status(201).json(supporter);
  } catch (err) {
    console.error("Error inviting supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error inviting supporter" });
  }
});

/**
 * PATCH /api/supporters/:supporterId?userId=...
 * Body: { status?, permissions?, boundaries? }
 */
router.patch("/:supporterId", async (req, res) => {
  try {
    const { supporterId } = req.params;
    const { userId } = req.query;
    const { status, permissions, boundaries } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const supporter = await updateSupporter({
      ownerUserId: userId,
      supporterId,
      status,
      permissions,
      boundaries,
    });

    res.json(supporter);
  } catch (err) {
    console.error("Error updating supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error updating supporter" });
  }
});

/**
 * GET /api/supporters/accept-invite?token=...
 * Used by the supporter magic link.
 */
router.get("/accept-invite", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const supporter = await acceptInviteByToken({ token });

    res.json({
      supporterId: supporter._id,
      ownerUserId: supporter.ownerUserId,
      fullName: supporter.fullName,
      relationship: supporter.relationship,
    });
  } catch (err) {
    console.error("Error accepting supporter invite:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error accepting invite" });
  }
});

/**
 * GET /api/supporters/:supporterId/summary
 * Used by the supporter dashboard (and also by the job seeker to preview).
 */
router.get("/:supporterId/summary", async (req, res) => {
  try {
    const { supporterId } = req.params;

    const payload = await getSupporterSummary({ supporterId });
    res.json(payload);
  } catch (err) {
    console.error("Error getting supporter summary:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error getting supporter summary" });
  }
});
router.post("/wellbeing/checkins", async (req, res) => {
  try {
    const { userId } = req.query;
    const { stressLevel, moodLevel, energyLevel, note } = req.body;

    const checkin = await createWellbeingCheckin({
      userId,
      stressLevel,
      moodLevel,
      energyLevel,
      note,
    });

    res.status(201).json(checkin);
  } catch (err) {
    console.error("Error creating wellbeing checkin:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error creating checkin" });
  }
});

/**
 * GET /api/wellbeing/checkins?userId=...&days=14
 * Optional: generic endpoint for user to see their own data.
 */
router.get("/wellbeing/checkins", async (req, res) => {
  try {
    const { userId, days } = req.query;

    const list = await getRecentCheckins({
      userId,
      days: days ? Number(days) : 14,
    });

    res.json(list);
  } catch (err) {
    console.error("Error getting wellbeing checkins:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error getting checkins" });
  }
});



router.post("/accept-invite-auth", async (req, res) => {
  try {
    const { supporterUserId } = req.query;
    const { token } = req.body;

    if (!supporterUserId) {
      return res.status(400).json({ error: "supporterUserId is required" });
    }
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const supporter = await acceptInviteForUser({ token, supporterUserId });

    res.json({
      supporterId: supporter._id,
      ownerUserId: supporter.ownerUserId,
      fullName: supporter.fullName,
      relationship: supporter.relationship,
    });
  } catch (err) {
    console.error("Error accepting invite (auth):", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error accepting invite" });
  }
});


router.get("/as-supporter", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const list = await listSupportedPeople({ supporterUserId: userId });
    res.json(list);
  } catch (err) {
    console.error("Error listing supported people:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error listing supported people" });
  }
});


router.post("/milestones", async (req, res) => {
  try {
    const { userId } = req.query;
    const { type, title, message, jobId, visibility, supporterIds } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const milestone = await createMilestone({
      ownerUserId: userId,
      type,
      title,
      message,
      jobId,
      visibility,
      supporterIds,
    });

    res.status(201).json(milestone);
  } catch (err) {
    console.error("Error creating milestone:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error creating milestone" });
  }
});




router.post("/supportupdate", async (req, res) => {
  try {
    const { userId } = req.query;
    const { type, title, body, toneTag, visibility, supporterIds } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const update = await createSupportUpdate({
      ownerUserId: userId,
      type,
      title,
      body,
      toneTag,
      visibility,
      supporterIds,
    });

    res.status(201).json(update);
  } catch (err) {
    console.error("Error creating support update:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error creating support update" });
  }
});



/**
 * GET /api/wellbeing-support/overview?userId=...&weeks=4
 */
router.get("/wellbeing-support/overview", async (req, res) => {
  try {
    const { userId, weeks } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const overview = await getWellbeingSupportOverview({
      userId,
      weeks: weeks ? Number(weeks) : 4,
    });

    res.json(overview);
  } catch (err) {
    console.error("Error getting wellbeing support overview:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error" });
  }
});

/**
 * PUT /api/wellbeing-support/plan?userId=...
 * Body: { resetPlan: string }
 */
router.put("/wellbeing-support/plan", async (req, res) => {
  try {
    const { userId } = req.query;
    const { resetPlan } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const settings = await saveWellbeingResetPlan({
      userId,
      resetPlan: resetPlan || "",
    });

    res.json({ resetPlan: settings.resetPlan || "" });
  } catch (err) {
    console.error("Error saving wellbeing reset plan:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error" });
  }
});

/**
 * POST /api/wellbeing-checkins?userId=...
 * Body: { stressLevel, moodLevel, energyLevel?, note? }
 */
router.post("/wellbeing-checkins/", async (req, res) => {
  try {
    const { userId } = req.query;
    const { stressLevel, moodLevel, energyLevel, note } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!stressLevel || !moodLevel) {
      return res
        .status(400)
        .json({ error: "stressLevel and moodLevel are required" });
    }

    const doc = await WellbeingCheckin.create({
      userId,
      stressLevel,
      moodLevel,
      energyLevel: energyLevel || undefined,
      note: note || undefined,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Error creating wellbeing check-in:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error" });
  }
});

export default router;