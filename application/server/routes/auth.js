import express from 'express';
import { createUser } from '../services/user.service.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await createUser({ email, password, firstName, lastName });
    // Return new userId so client can use it for subsequent profile calls
    return res.status(201).json({ userId: String(user._id), user });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
