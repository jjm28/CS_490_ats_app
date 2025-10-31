// application/server/routes/profile.js
import { Router } from 'express';
import Profile from '../models/profile.js';
import { verifyJWT } from '../middleware/auth.js';
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

const router = Router();

// all profile routes need auth
router.use(verifyJWT);

// ================== START: new helper ==================
// unified way to get "who is this?"
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}
// ================== END: new helper ==================

// pick only allowed fields
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

function calculateProfileCompleteness(profile) {
  const weights = {
    fullName: 10,
    headline: 10,
    industry: 10,
    experienceLevel: 10,
    location: 10,
    skills: 20,
    education: 10,
    photoUrl:10,
    projects: 10,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [field, weight] of Object.entries(weights)) {
    totalWeight += weight;
    const value = profile[field];
    if (Array.isArray(value) && value.length > 0) score += weight;
    else if (typeof value === "string" && value.trim()) score += weight;
    else if (value) score += weight;
  }

  const percent = Math.round((score / totalWeight) * 100);

  let badge;
  if (percent >= 90) badge = "🏆 Profile Expert";
  else if (percent >= 70) badge = "💼 Career Ready";
  else if (percent >= 50) badge = "🚀 Rising Star";
  else badge = "✨ Getting Started";

  return { score: percent, badge };
}

function getProfileSuggestions(profile) {
  const suggestions = [];

  if (!profile.photoUrl)
    suggestions.push("Add a professional photo to make your profile stand out.");
  if (!profile.skills?.length)
    suggestions.push("Add skills relevant to your field.");
  if (!profile.projects?.length)
    suggestions.push("Showcase your experience by adding projects.");
  if (!profile.education)
    suggestions.push("Include your educational background.");

  return suggestions;
}
// GET /api/profile/completeness/:userId
router.get("/completeness/:userId", async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.params;

    // Get the base profile
    const profile = await db.collection("profiles").findOne({ userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // 🔹 Fetch counts from related collections
    const skillsCount = await db.collection("skills").countDocuments({ userId });
    const projectsCount = await db.collection("projects").countDocuments({ userId });
    const educationCount = await db.collection("education").countDocuments({ userId });

    // 🔹 Attach as pseudo-arrays for completeness calculation
    profile.skills = Array(skillsCount).fill("x");
    profile.projects = Array(projectsCount).fill("x");
    profile.education = Array(educationCount).fill("x");

    // 🔹 Calculate and build response
    const completeness = calculateProfileCompleteness(profile);
    const suggestions = getProfileSuggestions(profile);

    const industryAverage = 80;
    const comparison = completeness.score - industryAverage;

    res.json({
      ...completeness,
      suggestions,
      comparison,
      industryAverage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate profile completeness" });
  }
});


/**
 * GET /api/profile
 * one-profile-per-user -> 0 or 1 item
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Profile.findOne({ userId }).lean();
    // keep array shape if your UI expects array
    res.json(doc ? [doc] : []);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * GET /api/profile/:id
 * must belong to current user, but allow fallback for old docs
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // ================== START: new fallback logic ==================
    let doc = await Profile.findOne({ _id: req.params.id, userId }).lean();
    if (!doc) {
      // old doc saved without this userId? grab it
      doc = await Profile.findById(req.params.id).lean();
      if (doc) {
        // reattach correct user for next time
        await Profile.updateOne(
          { _id: req.params.id },
          { $set: { userId } }
        );
      }
    }
    // ================== END: new fallback logic ==================

    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * POST /api/profile
 * create OR update (enforce 1 per user)
 */
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = pickProfileFields(req.body);

    const existing = await Profile.findOne({ userId });
    if (existing) {
      const updated = await Profile.findOneAndUpdate(
        { _id: existing._id, userId },
        { $set: body },
        { new: true, runValidators: true, omitUndefined: true }
      );
      return res.status(200).json(updated);
    }

    const created = await Profile.create({ ...body, userId });
    return res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Create failed' });
  }
});

/**
 * PUT /api/profile/:id
 * update existing profile; fix old ones that had wrong userId
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const $set = pickProfileFields(req.body);

    // ================== START: new fallback logic ==================
    // 1) try strict match
    let updated = await Profile.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set },
      { new: true, runValidators: true, omitUndefined: true }
    );

    // 2) if not found, try by id only (old record)
    if (!updated) {
      const exists = await Profile.findById(req.params.id);
      if (!exists) {
        return res.status(404).json({ error: 'Not found' });
      }
      // reattach correct userId and update
      updated = await Profile.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { ...$set, userId } },
        { new: true, runValidators: true, omitUndefined: true }
      );
    }
    // ================== END: new fallback logic ==================

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Update failed' });
  }
});

export default router;
