import express from "express";
import { getApplicationMethodPerformance } from "../services/applicationMethods.service.js";

const router = express.Router();

// GET /api/analytics/application-methods
router.get("/", async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.headers["x-dev-user-id"];

    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const data = await getApplicationMethodPerformance(userId);
    res.json(data);
  } catch (err) {
    console.error("Application method analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;