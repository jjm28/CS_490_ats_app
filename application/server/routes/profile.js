// server/routes/profile.js
import { Router } from "express";
import { getDb } from "../db/connection.js";
import {
  PROFILE_CONSTANTS,
  PROFILE_ENUMS,
  loadProfileEnumsFromDataSource,
} from "../constants/profile.js";

import Profile from '../models/profile.js';

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

// CREATE a new profile for the current dev user
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id; // from attachDevUser
    const doc = await Profile.create({ ...req.body, userId });
    return res.status(201).json(doc);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// LIST all profiles for current dev user
router.get('/', async (req, res) => {
  const userId = req.user?.id;
  const docs = await Profile.find({ userId }).sort({ createdAt: -1 });
  return res.json(docs);
});

// GET single profile by id and ensure it belongs to this user
router.get('/:id', async (req, res) => {
  const userId = req.user?.id;
  const doc = await Profile.findOne({ _id: req.params.id, userId });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  return res.json(doc);
});

// UPDATE profile by id
router.put('/:id', async (req, res) => {
  const userId = req.user?.id;
  const doc = await Profile.findOneAndUpdate(
    { _id: req.params.id, userId }, // ownership protection
    req.body,
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: 'Not found' });
  return res.json(doc);
});

// DELETE profile by id
router.delete('/:id', async (req, res) => {
  const userId = req.user?.id;
  const result = await Profile.deleteOne({ _id: req.params.id, userId });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: 'Not found' });
  return res.sendStatus(204);
});


export default router;