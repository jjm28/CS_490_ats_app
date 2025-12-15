import express from "express";
import { verifyJWT } from "../middleware/auth.js"; // ✅ adjust path if needed
import {
  createApplicationSchedule,
  listApplicationSchedules,
  rescheduleApplicationSchedule,
  submitScheduledApplicationNow,
  cancelApplicationSchedule,
  getSubmissionTimeStats,
  getBestPractices,
  listEligibleJobsForScheduler,
  getDefaultNotificationEmail,
  setDefaultNotificationEmail,
} from "../services/applicationScheduler.service.js";

const router = express.Router();

/**
 * Apply unified authentication logic
 * Supports both dev-mode header and JWT auth
 */
router.use((req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const hasBearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");

  if (hasBearer) {
    return verifyJWT(req, res, next);
  }

  const devUserId = req.headers["x-dev-user-id"];
  if (devUserId) {
    req.user = { _id: String(devUserId) };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
});

/**
 * Helper to normalize the user id consistently
 */
function getUserId(req) {
  const fromReq =
    req.userId ||
    req.user?.userId ||
    req.user?.id ||
    req.user?._id;

  const fromHeaders =
    req.headers["x-user-id"] ||
    req.headers["x-dev-user-id"];

  const id = fromReq || fromHeaders;
  return id ? String(id) : null;
}

/* -------------------------------------------------------------------------- */
/*                                 ENDPOINTS                                  */
/* -------------------------------------------------------------------------- */

// ✅ Create schedule
router.post("/schedules", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await createApplicationSchedule({ userId, payload: req.body });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create schedule" });
  }
});

// ✅ List schedules
router.get("/schedules", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await listApplicationSchedules({ userId, query: req.query });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to list schedules" });
  }
});

// ✅ Reschedule
router.post("/schedules/:id/reschedule", async (req, res) => {
  try {
    const userId = req.userId || getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Missing user credentials" });
    }

    const { scheduledAt, timezone } = req.body || {};
    const updated = await rescheduleApplicationSchedule(userId, req.params.id, {
      scheduledAt,
      timezone,
    });

    return res.json(updated);
  } catch (e) {
    console.error("reschedule error:", e);
    return res.status(400).json({ error: e?.message || "Failed to reschedule schedule." });
  }
});

// ✅ Submit Now
router.post("/schedules/:id/submit-now", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await submitScheduledApplicationNow({
      userId,
      scheduleId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to submit now" });
  }
});

// ✅ Cancel
router.delete("/schedules/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await cancelApplicationSchedule({
      userId,
      scheduleId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to cancel schedule" });
  }
});

// ✅ Stats
router.get("/stats/submission-time", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await getSubmissionTimeStats({ userId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to get submission stats" });
  }
});

// ✅ Best Practices
router.get("/best-practices", async (_req, res) => {
  try {
    const result = await getBestPractices();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to load best practices" });
  }
});

// ✅ Eligible Jobs (uses dev/JWT auth)
router.get("/eligible-jobs", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await listEligibleJobsForScheduler({ userId });

    // normalize response shape for frontend
    if (Array.isArray(result)) return res.json({ items: result });
    return res.json({ items: result?.items || [] });
  } catch (err) {
    console.error("Error fetching eligible jobs:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to load eligible jobs" });
  }
});

// ✅ Default Email
router.get("/default-email", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await getDefaultNotificationEmail({ userId });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to get default email" });
  }
});

router.put("/default-email", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await setDefaultNotificationEmail({ userId, payload: req.body });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to set default email" });
  }
});

export default router;
