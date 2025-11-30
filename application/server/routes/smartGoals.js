import express from "express";
import Goal from "../models/smartGoals.js";

const router = express.Router();

function getUserId(req) {
    return req.user?._id || req.headers["x-dev-user-id"];
}

/* ============================================================
   CREATE a new SMART goal
   POST /api/smart-goals
============================================================ */
router.post("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: "Missing user ID" });

        const {
            specific,
            measurable,
            achievable,
            relevant,
            deadline,
            linkedJobId,
            shortTermGoals
        } = req.body;

        // Business rule: A & R must be TRUE
        if (!achievable || !relevant) {
            return res.status(400).json({
                error: "Goal must be achievable AND relevant."
            });
        }

        const newGoal = await Goal.create({
            userId,
            specific,
            measurable: measurable || "Progress tracked automatically by OnTrack.",
            achievable,
            relevant,
            deadline,
            linkedJobId: linkedJobId || null,
            shortTermGoals: (shortTermGoals || []).map(st => ({
                ...st,
                linkedJobId: st.linkedJobId || linkedJobId || null
            }))
        });

        return res.json(newGoal);
    } catch (err) {
        console.error("Error creating SMART goal:", err);
        res.status(500).json({ error: "Failed to create SMART goal" });
    }
});

/* ============================================================
   GET all SMART goals for user
   GET /api/smart-goals
============================================================ */
router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: "Missing user ID" });

        const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
        return res.json(goals);
    } catch (err) {
        console.error("Error fetching goals:", err);
        res.status(500).json({ error: "Failed to load goals" });
    }
});

/* ============================================================
   GET single goal
   GET /api/smart-goals/:id
============================================================ */
router.get("/:id", async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ error: "Goal not found" });
        return res.json(goal);
    } catch (err) {
        console.error("Error fetching goal:", err);
        res.status(500).json({ error: "Failed to fetch goal" });
    }
});

/* ============================================================
   UPDATE a SMART goal
   PUT /api/smart-goals/:id
============================================================ */
router.put("/:id", async (req, res) => {
    try {
        const updates = req.body;
        updates.updatedAt = new Date();

        const updated = await Goal.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        if (!updated) return res.status(404).json({ error: "Goal not found" });
        return res.json(updated);
    } catch (err) {
        console.error("Error updating goal:", err);
        res.status(500).json({ error: "Failed to update goal" });
    }
});

// Update SHORT-TERM goal (complete/incomplete)
router.patch("/:goalId/short-term/:shortId", async (req, res) => {
    try {
        const { goalId, shortId } = req.params;
        const { completed } = req.body;

        const goal = await Goal.findById(goalId);
        if (!goal) return res.status(404).json({ error: "Goal not found" });

        const shortGoal = goal.shortTermGoals.id(shortId);
        if (!shortGoal) return res.status(404).json({ error: "Short-term goal not found" });

        shortGoal.completed = completed;
        shortGoal.completedAt = completed ? new Date() : null;

        await goal.save();
        return res.json(goal);
    } catch (err) {
        console.error("Error updating short-term goal:", err);
        res.status(500).json({ error: "Failed to update short-term goal" });
    }
});

/* ============================================================
   DELETE a goal
   DELETE /api/smart-goals/:id
============================================================ */
router.delete("/:id", async (req, res) => {
    try {
        const removed = await Goal.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ error: "Goal not found" });
        return res.json({ success: true });
    } catch (err) {
        console.error("Error deleting goal:", err);
        res.status(500).json({ error: "Failed to delete goal" });
    }
});

export default router;