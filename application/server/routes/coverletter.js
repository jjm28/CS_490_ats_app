import express from 'express';
import { createCoverletter} from '../services/user.service.js';
import { verifyJWT } from '../middleware/auth.js'; 
import 'dotenv/config';
import jwt from "jsonwebtoken";

const router = express.Router();

// router.use(verifyJWT);


// POST /api/coverletter/save
router.post('/save', async (req, res) => {
  try {
    const { userid, filename, coverletterdata, lastSaved} = req.body || {};
    if (!userid || !filename || !coverletterdata || !lastSaved) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coverletter = await createCoverletter({ userid, filename, lastSaved}, coverletterdata);

  
    return res.status(201).json(coverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});




  
export default router;
