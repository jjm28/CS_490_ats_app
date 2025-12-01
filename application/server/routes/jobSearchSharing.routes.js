// routes/jobSearchSharing.routes.js
import express from "express";
import {
  getOrCreateSharingProfile,
  updateSharingProfileSettings,
} from "../services/jobSearchSharing.service.js";

const router = express.Router();

/**
 * GET /api/job-search/sharing?userId=...
 * Fetch the current user's sharing profile.
 */
router.get("/job-search/sharing", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const profile = await getOrCreateSharingProfile(String(userId));
    res.json(profile);
  } catch (err) {
    console.error("Error fetching sharing profile:", err);
    res.status(500).json({ error: "Server error fetching sharing profile" });
  }
});

/**
 * POST /api/job-search/sharing?userId=...
 * Create or update the user's sharing settings.
 */
router.post("/job-search/sharing", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const {
      visibilityMode,
      allowedUserIds,
      blockedUserIds,
      scopes,
      defaultReportFrequency,
    } = req.body;

    const updated = await updateSharingProfileSettings({
      ownerUserId: String(userId),
      visibilityMode,
      allowedUserIds,
      blockedUserIds,
      scopes,
      defaultReportFrequency,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating sharing profile:", err);
    res.status(500).json({ error: "Server error updating sharing profile" });
  }
});

export default router;
