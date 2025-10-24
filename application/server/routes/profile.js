// server/routes/profile.js
import { Router } from "express";
import { getDb } from "../db/connection.js";
import {
  PROFILE_CONSTANTS,
  PROFILE_ENUMS,
  loadProfileEnumsFromDataSource,
} from "../constants/profile.js";

const router = Router();
const COLLECTION = "profiles";

// Prefer JWT (req.user.id) → header override → .env fallback
function getUserId(req) {
  return (
    req.user?.id ||
    req.headers["x-user-id"] ||
    process.env.DEV_USER_ID ||
    null
  );
}

/** GET /api/profile/constants */
router.get("/constants", (_req, res) => {
  res.json(PROFILE_CONSTANTS);
});

/** GET /api/profile/enums (dynamic if lookups exist, else static) */
router.get("/enums", async (_req, res) => {
  try {
    const enums = await loadProfileEnumsFromDataSource();
    res.json(enums || PROFILE_ENUMS);
  } catch (err) {
    res.status(500).json({ error: "Failed to load enums", details: String(err) });
  }
});

/** GET /api/profile/me */
router.get("/me", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "No user id" });

    const db = getDb();
    const doc = await db.collection(COLLECTION).findOne({ userId });
    if (!doc) return res.status(404).json({ error: "Profile not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", details: String(err) });
  }
});

/** POST /api/profile  (create if not exists; upsert with provided fields) */
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "No user id" });

    const db = getDb();
    const now = new Date();
    const payload = { ...req.body, userId };

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { userId },
      { $setOnInsert: { createdAt: now }, $set: { ...payload, updatedAt: now } },
      { upsert: true, returnDocument: "after" }
    );

    // return the document itself 
    res.status(201).json({
      message: "Profile created/updated",
      profile: result?.value ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create/update profile", details: String(err) });
  }
});

/** PUT /api/profile  */
router.put("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "No user id" });

    const db = getDb();
    const now = new Date();
    const update = { ...req.body, updatedAt: now, userId };

    const { matchedCount } = await db
      .collection(COLLECTION)
      .updateOne({ userId }, { $set: update });

    if (!matchedCount) {
      return res
        .status(404)
        .json({ error: "Profile not found. Create it first with POST /api/profile." });
    }

    const doc = await db.collection(COLLECTION).findOne({ userId });
    res.json({ message: "Profile updated", profile: doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: String(err) });
  }
});

/** PATCH /api/profile (partial update; requires existing doc) */
router.patch("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "No user id" });

    const db = getDb();
    const now = new Date();

    const { matchedCount } = await db
      .collection(COLLECTION)
      .updateOne({ userId }, { $set: { ...req.body, updatedAt: now } });

    if (!matchedCount) {
      return res
        .status(404)
        .json({ error: "Profile not found. Create it first with POST /api/profile." });
    }

    const doc = await db.collection(COLLECTION).findOne({ userId });
    res.json({ message: "Profile patched", profile: doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to patch profile", details: String(err) });
  }
});

export default router;
