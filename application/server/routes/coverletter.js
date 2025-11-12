import express from 'express';
import { createCoverletter, updateCoverletter, getCoverletter, createSharedLink, fetchSharedCoverletter,findmostpopular} from '../services/coverletter.service.js';
import { verifyJWT } from '../middleware/auth.js'; 
import 'dotenv/config';
import jwt from "jsonwebtoken";

const router = express.Router();

router.use(verifyJWT);

// GET /api/coverletter/
router.get("/", async (req, res) => {
  try {
    const { userid, coverletterid } = req.query 

    if (!userid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coverletters = await getCoverletter({userid,coverletterid})

    res.status(200).json(coverletters);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/coverletter/mostpop
router.get("/mostpop", async (req, res) => {
  try {


    const templateKey = await findmostpopular()

    res.status(200).json(templateKey);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/coverletter/save
router.post('/save', async (req, res) => {
  try {
    const { userid, filename,templateKey,coverletterdata, lastSaved} = req.body || {};
    if (!userid || !filename || !coverletterdata || !lastSaved || !templateKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coverletter = await createCoverletter({ userid, filename, lastSaved,templateKey}, coverletterdata);

  
    return res.status(201).json(coverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/coverletter/update
router.put('/update', async (req, res) => {
  try {
    const { coverletterid, userid, filename, coverletterdata, lastSaved} = req.body || {};
    if (!coverletterid ||!userid || !filename || !coverletterdata || !lastSaved) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coverletter = await updateCoverletter({ coverletterid,userid, filename, lastSaved}, coverletterdata);
    if (coverletter.message)  return res.status(404).json({ message: "CoverLetter not found" });
  
    return res.status(201).json(coverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});


  // POST /api/coverletter/share
router.post('/share', async (req, res) => {
  try {
    const { coverletterid, userid,coverletterdata} = req.body || {};
    if (!userid || !coverletterid || !coverletterdata ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const coverletter = await createSharedLink({ userid,coverletterid,coverletterdata});

  
    return res.status(201).json(coverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/share', async (req, res) => {
  try {
    const { sharedid } = req.query 
    if (!sharedid ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const sharedcoverletter = await fetchSharedCoverletter({ sharedid});
    if (sharedcoverletter == null){
      return res.status(404).json({ error: "Share link invalid or expired" });

    }
  
    return res.status(201).json(sharedcoverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Share link invalid or expired" });
  }
});


export default router;
