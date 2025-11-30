// routes/supporters.routes.js
import express from "express";
import {
  listSupporters,
  inviteSupporter,
  updateSupporter,
  acceptInviteByToken,
    getSupporterSummary,  createWellbeingCheckin,
    getWellbeingSnapshot,
  getRecentCheckins,acceptInviteForUser,listSupportedPeople
} from "../services/supporters.service.js";

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
export default router;
