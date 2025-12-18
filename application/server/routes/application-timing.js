import express from "express";
import { getApplicationTimingAnalytics } from "../services/applicationTiming.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id || req.headers["x-dev-user-id"];
    if (!userId) return res.status(400).json({ error: "Missing user id" });

    const data = await getApplicationTimingAnalytics(userId);
    res.json(data);
  } catch (err) {
    console.error("Timing analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;