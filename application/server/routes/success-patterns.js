import express from "express";
import { computeSuccessPatterns } from "../services/successPatterns.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-dev-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "Missing x-dev-user-id header" });
    }

    const result = await computeSuccessPatterns(userId);
    res.json(result);
  } catch (err) {
    console.error("Failed to compute success patterns:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;