// routes/automation.js
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";
import AutomationRule from "../models/automationRule.js";

const router = Router();

/**
 * Attach dev user OR verify JWT, same pattern as routes/jobs.js
 */
router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

/**
 * GET /api/automation
 * List all rules for current user
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rules = await AutomationRule.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(rules);
  } catch (err) {
    console.error("Error fetching automation rules:", err);
    res.status(500).json({ error: "Failed to fetch automation rules" });
  }
});

/**
 * GET /api/automation/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      userId,
    });

    if (!rule) return res.status(404).json({ error: "Rule not found" });
    res.json(rule);
  } catch (err) {
    console.error("Error fetching automation rule:", err);
    res.status(500).json({ error: "Failed to fetch automation rule" });
  }
});

/**
 * POST /api/automation
 */
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { type, schedule, config } = req.body;

    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }

    let scheduleDate = null;

    // Only these rule types *require* an explicit schedule
    if (type === "submission_schedule" || type === "follow_up") {
      if (!schedule) {
        return res
          .status(400)
          .json({ error: "schedule is required for this rule type" });
      }
      scheduleDate = new Date(schedule);
      if (isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ error: "Invalid schedule date/time" });
      }
    } else {
      // For immediate rules (application_package, template_response, checklist),
      // if no schedule is provided, default to "now" so the engine runs them once.
      scheduleDate = schedule ? new Date(schedule) : new Date();
    }

    const rule = await AutomationRule.create({
      userId,
      type,
      schedule: scheduleDate,
      config: config || {},
    });

    res.status(201).json(rule);
  } catch (err) {
    console.error("Error creating automation rule:", err);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

/**
 * PUT /api/automation/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { type, schedule, config, enabled } = req.body;

    const update = {};
    if (type) update.type = type;

    if (schedule !== undefined) {
      const date = new Date(schedule);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid schedule date/time" });
      }
      update.schedule = date;
    }

    if (config !== undefined) update.config = config;
    if (enabled !== undefined) update.enabled = enabled;

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: update },
      { new: true }
    );

    if (!rule) return res.status(404).json({ error: "Rule not found" });
    res.json(rule);
  } catch (err) {
    console.error("Error updating automation rule:", err);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

/**
 * DELETE /api/automation/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rule = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!rule) return res.status(404).json({ error: "Rule not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting automation rule:", err);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

export default router;