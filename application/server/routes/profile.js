// application/server/routes/profile.js
import { Router } from 'express';
import Profile from '../models/profile.js';

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

export default router;
