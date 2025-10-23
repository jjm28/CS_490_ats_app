// server/routes/profile.js
import express from 'express';
import { getProfileByUserId, upsertProfileByUserId } from '../service/profile.js';

const router = express.Router();

// GET /api/users/me
router.get('/', async (req, res) => {
  const userId = req.user.id; // set by attachDevUser
  try {
    const doc = await getProfileByUserId(userId);
    if (!doc) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, data: doc });
  } catch (e) {
    console.error('GET /api/users/me error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

// PUT /api/users/me
router.put('/', async (req, res) => {
  const userId = req.user.id;
  try {
    // TODO: plug in your existing validators here; keeping simple for now
    const saved = await upsertProfileByUserId(userId, req.body || {});
    res.json({ ok: true, data: saved });
  } catch (e) {
    console.error('PUT /api/users/me error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

export default router;
