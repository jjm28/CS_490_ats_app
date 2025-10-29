
// application/server/routes/profile.js
import { Router } from 'express';
import Profile from '../models/profile.js';
import { ObjectId } from "mongodb";
import { verifyJWT } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";
import sendEmail from "../constants/sendEmail.js";


const router = Router();

/**
 * Build a safe update payload and only allow known fields.
 * photoUrl is included only when a non-empty string is provided,
 * so it will not be overwritten on updates unless explicitly changed.
 */
function pickProfileFields(src = {}) {
  const out = {
    fullName: src.fullName,
    email: src.email,
    phone: src.phone,
    headline: src.headline,
    bio: src.bio,
    industry: src.industry,
    experienceLevel: src.experienceLevel,
    location: {
      city: src?.location?.city,
      state: src?.location?.state,
    },
    photoUrl: undefined,
  };

  if (typeof src.photoUrl === 'string' && src.photoUrl.trim() !== '') {
    out.photoUrl = src.photoUrl.trim();
  }

  if (
    out.location &&
    out.location.city === undefined &&
    out.location.state === undefined
  ) {
    delete out.location;
  }
  return out;
}

/** Create a profile (allows multiple per user) */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-dev-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = pickProfileFields(req.body);
    const created = await Profile.create({ ...body, userId });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Create failed' });
  }
});

/** List profiles for current user */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-dev-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const docs = await Profile.find({ userId }).sort({ updatedAt: -1 }).lean();
    res.json(docs);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/** Get a single profile by id (must belong to user) */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-dev-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Profile.findOne({ _id: req.params.id, userId }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});
// All routes require authentication
router.use(verifyJWT);

/**
 * Helper: Check ownership or admin
 */
function assertOwnershipOrAdmin(req, profileUserId) {
  const requesterId = req.user?._id?.toString();
  const isAdmin = req.user?.isAdmin === true;
  if (isAdmin) return true;
  return requesterId && requesterId === profileUserId?.toString();
}

/**
 * GET /api/profile
 * - Regular user: returns their own profile
 * - Admin: returns all profiles
 */
router.get("/", async (req, res) => {
  try {
    const db = getDb();

    if (req.user.isAdmin) {
      const profiles = await db.collection(COLLECTION).find().toArray();
      return res.json(profiles);
    }

    const profile = await db.collection(COLLECTION).findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * GET /api/profile/:id
 * - Only owner or admin can access
 */
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const profile = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (!assertOwnershipOrAdmin(req, profile.userId)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * POST /api/profile
 * - Create or upsert profile for current user
 */
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const now = new Date();
    const payload = { ...req.body, userId: req.user._id };

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { createdAt: now }, $set: { ...payload, updatedAt: now } },
      { upsert: true, returnDocument: "after" }
    );

    res.status(201).json({
      message: "Profile created/updated",
      profile: result.value,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create/update profile" });
  }
});

/**

 * Update a profile by id.
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-dev-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const $set = pickProfileFields(req.body);

    const updated = await Profile.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set },
      { new: true, runValidators: true, omitUndefined: true }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Update failed' });
  }
});

 /* PUT /api/profile/:id
 * - Only owner or admin can update
 */
router.put("/:id", async (req, res) => {
  try {
    const db = getDb();
    const profile = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (!assertOwnershipOrAdmin(req, profile.userId)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const updated = await db
      .collection(COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { ...req.body, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    res.json(updated.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * DELETE /api/profile/:id
 * - Only owner or admin can delete
 */
router.delete("/delete", async (req, res) => {
  try {
    const { password } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ error: "Unauthorized: missing user info" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password required" });
    }

    const db = getDb();

    // Fetch user by UUID
    const user = await db.collection("users").findOne({ _id: req.user._id });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isDeleted) return res.status(400).json({ error: "Account already deleted" });

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const now = new Date();

    // Soft-delete user and profile
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );

    await db.collection("profiles").updateOne(
      { userId: user._id },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: "Account deletion scheduled",
        text: "Your account has been scheduled for deletion. It will be permanently removed after 30 days.",
      });
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    // Success response (frontend should log out)
    res.json({ message: "Account deletion scheduled. You will be logged out." });

  } catch (err) {
    console.error("Account deletion failed:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});


export default router;
