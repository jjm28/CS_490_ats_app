import express from 'express';
import { createCoverletter, updateCoverletter, getCoverletter, createSharedLink, fetchSharedCoverletter,findmostpopular,GetRelevantinfofromuser,GenerateCoverletterBasedON, updateCoverletterSharedsettings, inviteReviewer,  addreviewerCoverletterSharedsettings, removereviewerCoverletterSharedsettings, addSharedCoverletterComment, updateSharedCoverletterComment} from '../services/coverletter.service.js';
import { verifyJWT } from '../middleware/auth.js';
import axios from "axios";
import 'dotenv/config';
import jwt from "jsonwebtoken";
import { jobs } from 'googleapis/build/src/apis/jobs/index.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

//const genAI_rewrite = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);


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
    const { coverletterid, userid,coverletterdata,visibility,allowComments} = req.body || {};
    if (!userid || !coverletterid || !coverletterdata ||  !visibility ||  !allowComments) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await updateCoverletterSharedsettings({coverletterid,userid,visibility,allowComments})
    const coverletter = await createSharedLink({ userid,coverletterid,coverletterdata});

  
    return res.status(201).json(coverletter);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});
  // GET /api/coverletter/share
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
router.post(
  "/shared/:sharedid/comments",
  
  async (req, res) => {
    try {
      const viewerId = req.query.userId
      const { message } = req.body || {};
      if (!viewerId || !message || !message.trim()) {
        return res.status(400).json({ error: "Missing viewer or message" });
      }

      const updated = await addSharedCoverletterComment({
        sharedid: req.params.sharedid,
        viewerid: viewerId,
        message: message.trim(),
      });

      if (!updated) {
        return res
          .status(404)
          .json({ error: "Share link invalid or expired" });
      }

      // You can return either {comments:[...]} or {comment: {...}}.
      res.status(201).json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.patch(
  "/shared/:sharedid/comments/:commentId",
  verifyJWT,
  async (req, res) => {
    try {
      const viewerId = req.query.userId
      const { resolved } = req.body || {};
      if (typeof resolved !== "boolean") {
        return res.status(400).json({ error: "Missing resolved flag" });
      }

      const updated = await updateSharedCoverletterComment({
        sharedid: req.params.sharedid,
        commentId: req.params.commentId,
        viewerid: viewerId, // service should enforce "only owner can resolve"
        resolved,
      });

      if (updated?.error === "forbidden") {
        return res.status(403).json({ error: "Not allowed" });
      }
      if (!updated) {
        return res
          .status(404)
          .json({ error: "Share link or comment not found" });
      }

      res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  }
);
// POST /api/coverletter/generate-coverletterai
router.post("/generate-coverletterai", async (req, res) => {
  try {
    // ✅ extract toneSettings here so it exists in this scope
    const { userid, Jobdata, toneSettings, experienceMode } = req.body || {};
    
    console.log("🟦 experienceMode received from frontend:", experienceMode);
    

    if (!userid || !Jobdata) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const Usersinfo = await GetRelevantinfofromuser(userid);

    // Clean Jobdata
    delete Jobdata._id;
    delete Jobdata.userId;
    delete Jobdata.createdAt;
    delete Jobdata.updatedAt;
    delete Jobdata.__v;

    // 🧠 Fetch live company research
    let CompanyInfo;
    try {
      const resCompany = await axios.post(
        "http://localhost:5050/api/company/research",
        { companyName: Jobdata.company }
      );
      CompanyInfo = resCompany.data;
      console.log("✅ Company info fetched for:", Jobdata.company);
    } catch (err) {
      console.warn("⚠️ Company research failed, using fallback:", err.message);
      CompanyInfo = {
        name: Jobdata.company,
        roleTitle: Jobdata.jobTitle,
        description: "No detailed company info available.",
        mission: "Not specified",
        values: ["innovation"],
        cultureTraits: ["inclusive", "collaborative"],
        recent_news: [],
        industry: "Not specified",
      };
    }

    // Normalize
    CompanyInfo.roleTitle = Jobdata.jobTitle;
    CompanyInfo.cultureTraits = [CompanyInfo.culture || "inclusive", "collaborative"];
    CompanyInfo.values = CompanyInfo.values?.split?.(",") ?? [CompanyInfo.values ?? "innovation"];
    CompanyInfo.productLines = [CompanyInfo.industry || "Not specified"];
    CompanyInfo.toneHint = "professional and authentic";
    CompanyInfo.recentNews =
      CompanyInfo.news?.map((n) => ({
        title: n.title,
        summary: n.summary,
        date: n.publishedAt,
        url: n.link,
      })) ?? [];

      
    // LOG what we are sending to generator
    console.log("🔥 Sending into generator → experienceMode:", experienceMode);

    // ✅ Pass toneSettings safely (defaults to empty object if missing)
    const AIresponse = await GenerateCoverletterBasedON(
      Usersinfo,
      CompanyInfo,
      Jobdata,
      {
        variations: 2,
        maxWords: 430,
        temperature: 0.65,
        candidateCount: 3,
        toneSettings: toneSettings || {},
        experienceMode: experienceMode === true,
      }
    );

    return res.status(201).json(AIresponse);
  } catch (err) {
    console.error("❌ Error in /generate-coverletterai:", err);
    return res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

// POST /api/coverletter/rewrite
router.post("/rewrite", async (req, res) => {
  try {
    console.log("🔥 REWRITE BODY:", req.body);
    const { text, instruction } = req.body;

    if (!text || !instruction) {
      return res.status(400).json({ error: "Missing text or instruction" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);

    // Use same model as your main generator (because your version supports it!)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "Rewrite ONLY the provided text. Do not add new ideas. Return only the rewritten text. No markdown."
    });

    const prompt = `
Rewrite the following text using this instruction:

Instruction: ${instruction}

Text:
${text}

Return only the rewritten text. No headers, no markdown, no explanations.
`;

    const result = await model.generateContent(prompt);
    const out = result.response.text().trim();

    return res.json({ rewritten: out });

  } catch (err) {
    console.error("🔥 Rewrite API Error:", err);
    return res.status(500).json({
      error: "Rewrite failed",
      details: err.message
    });
  }
});


/**
 * POST /api/supporters/invite?userId=...
 * Body: { fullName, email, relationship?, presetKey? }
 */
router.post("/invite", async (req, res) => {
  try {
    const { userId } = req.query;
    const { toemail, sharedurl,coverletterid } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!toemail || !sharedurl || !coverletterid) {
      return res
        .status(400)
        .json({ error: "toemail and toemail are required" });
    }

    const sent = await inviteReviewer({
    ownerUserId: userId, email: toemail, url: sharedurl  });
    await addreviewerCoverletterSharedsettings({coverletterid,userId,toemail})
    res.status(201).json(sent);
  } catch (err) {
    console.error("Error inviting supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error inviting supporter" });
  }
});


/**
 * POST /api/supporters/invite?userId=...
 * Body: { fullName, email, relationship?, presetKey? }
 */
router.delete("/removeinvite", async (req, res) => {
  try {
    const { userId } = req.query;
    const { email, coverletterid } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if ( !coverletterid) {
      return res
        .status(400)
        .json({ error: "coverletterid are required" });
    }

    
    await removereviewerCoverletterSharedsettings({coverletterid,userId,email})
    res.status(201).json(true);
  } catch (err) {
    console.error("Error inviting supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error inviting supporter" });
  }
});
export default router;
