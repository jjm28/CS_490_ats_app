// Used for GET and PUT with the /profile route

import express from 'express';
import { validateProfile } from '../validators/profile.js';
import { getProfileByUserId, upsertProfileByUserId } from "../service/profile.js";

const router = express.Router();

// TEMP auth stub (replace with real auth later)
router.use((req, _res, next) => {
  req.user = { id: 'TEMP_USER_ID' }; // TODO: replace with real user id. Authentication middleware needs to be completed first.
  next();
});

// GET /api/users/me
router.get('/', async (req, res, next) => {
  try {
    const doc = await getProfileByUserId(req.user.id);
    if (!doc) return res.status(404).send({ ok: false, error: { code: 'NOT_FOUND' } });
    res.send({ ok: true, data: doc });
  } catch (err) { next(err); }
});

// PUT /api/users/me
router.put('/', async (req, res, next) => {
  try {
    const result = await validateProfile(req.body);
    if (!result.ok) return res.status(result.status).send(result);

    const saved = await upsertProfileByUserId(req.user.id, result.value);
    res.send({ ok: true, data: saved });
  } catch (err) { next(err); }
});

export default router;