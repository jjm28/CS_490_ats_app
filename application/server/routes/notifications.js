// ============================================
// FILE: routes/notifications.js
// ============================================
// Handles notification preferences, history, and test notifications
// ============================================

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";
import { verifyJWT } from "../middleware/auth.js";
import notificationService from "../services/notifications.service.js";

const router = Router();

// ============================================
// AUTH + UTIL HELPERS
// ============================================

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

function getDevId(req) {
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

// ============================================
// HELPERS
// ============================================

async function createDefaultPreferences(userId) {
  const db = getDb();
  const defaults = {
    userId: String(userId),
    email: {
      enabled: true,
      types: { approaching: true, dayBefore: true, dayOf: true, overdue: true },
      approachingDays: 3,
    },
    inApp: {
      enabled: true,
      types: { approaching: true, dayBefore: true, dayOf: true, overdue: true },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("notificationpreferences").insertOne(defaults);
  return { ...defaults, _id: result.insertedId };
}

// ============================================
// GET /api/notifications/preferences
// ============================================

router.get("/preferences", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    let preferences = await db.collection("notificationpreferences").findOne({ userId });

    if (!preferences) preferences = await createDefaultPreferences(userId);

    res.json(preferences);
  } catch (err) {
    console.error("Error fetching preferences:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch notification preferences" });
  }
});

// ============================================
// PUT /api/notifications/preferences
// ============================================

router.put("/preferences", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const { email, inApp } = req.body;

    const existing = await db.collection("notificationpreferences").findOne({ userId });
    if (!existing) await createDefaultPreferences(userId);

    const updateData = {
      updatedAt: new Date(),
      ...(email && { email }),
      ...(inApp && { inApp }),
    };

    await db.collection("notificationpreferences").updateOne(
      { userId },
      { $set: updateData }
    );

    const updated = await db.collection("notificationpreferences").findOne({ userId });
    res.json(updated);
  } catch (err) {
    console.error("Error updating preferences:", err);
    res.status(500).json({ error: err?.message || "Failed to update preferences" });
  }
});

// ============================================
// GET /api/notifications/history
// ============================================

router.get("/history", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const logs = await db.collection("notificationlogs")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Attach job details
    const withJobs = await Promise.all(
      logs.map(async (log) => {
        const job = await db.collection("jobs").findOne(
          { _id: new ObjectId(log.jobId) },
          { projection: { jobTitle: 1, company: 1, applicationDeadline: 1 } }
        );
        return { ...log, job };
      })
    );

    res.json(withJobs);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch notification history" });
  }
});

// ============================================
// POST /api/notifications/test
// ============================================

router.post("/test", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();

    // Find a job with a deadline
    const job = await db.collection("jobs").findOne({
      userId,
      applicationDeadline: { $exists: true, $ne: null },
    });

    if (!job) {
      return res.status(404).json({ error: "No jobs with deadlines found to test with" });
    }

    const preferences = await db.collection("notificationpreferences").findOne({ userId });

    // Handle both real ObjectIds and dev IDs safely
    const userQuery = ObjectId.isValid(userId)
      ? { _id: new ObjectId(userId) }
      : { _id: userId };

    const user = await db.collection("users").findOne(userQuery);

    if (!user) return res.status(404).json({ error: "User not found" });

    const userWithPrefs = {
      _id: user._id,
      email: user.email,
      name: user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user.email,
      preferences: preferences || await createDefaultPreferences(userId),
    };

    await notificationService.sendDeadlineEmail(userWithPrefs, job, "approaching", 3);

    res.json({
      message: "Test notification sent!",
      job: { title: job.jobTitle, company: job.company },
    });
  } catch (err) {
    console.error("Error sending test notification:", err);
    res.status(500).json({ error: err?.message || "Failed to send test notification" });
  }
});

export default router;
