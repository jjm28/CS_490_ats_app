import express from 'express';
import { createUser,verifyUser } from '../services/user.service.js';
import 'dotenv/config';
import jwt from "jsonwebtoken";
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
    const token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});

    return res.status(201).json({ token, userId: String(user._id), user });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password} = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await verifyUser({ email, password});
    // Return new userId so client can use it for subsequent profile calls
    const token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});
      console.log(token)
    return res.status(201).json({token, userId: String(user._id), user });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
