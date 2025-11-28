import express from "express";
import Goals from "../models/goals.js";

const router = express.Router();

// Helper to extract dev user ID
function getUserId(req) {
  const userId = req.headers["x-dev-user-id"];
  if (!userId) {
    throw new Error("Missing x-dev-user-id header");
  }
  return userId;
}

// GET goals
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    let goals = await Goals.findOne({ userId });
    if (!goals) {
      goals = await Goals.create({
        userId,
        weeklyApplicationsGoal: 10,
        weeklyInterviewsGoal: 2,
      });
    }

    res.json(goals);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE goals
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { weeklyApplicationsGoal, weeklyInterviewsGoal } = req.body;

    const goals = await Goals.findOneAndUpdate(
      { userId },
      {
        weeklyApplicationsGoal,
        weeklyInterviewsGoal,
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    res.json(goals);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;