import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { GenerateResumeBasedOn } from "../services/resume_ai.service.js";
import {
  createResume, updateResume, getResume, deleteResume,
  createSharedResume, fetchSharedResume,
} from "../services/resume.service.js";

const router = express.Router();

// Bridge cookie → Authorization header
router.use((req, _res, next) => {
  if (!req.headers.authorization && req.cookies?.token) {
    req.headers.authorization = `Bearer ${req.cookies.token}`;
  }
  next();
});

// Require JWT (header now present)
router.use(verifyJWT);

const userIdFrom = (req) =>
  req.query?.userid || req.body?.userid || req.user?._id || req.user?.id;

// GET list
router.get("/", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { resumeid } = req.query;
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await getResume({ userid, resumeid });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await getResume({ userid, resumeid: req.params.id });
    if (!out) return res.status(404).json({ error: "NotFound" });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { filename, templateKey, resumedata, lastSaved } = req.body || {};
    if (!userid || !filename || !templateKey || !resumedata)
      return res.status(400).json({ error: "Missing fields" });

    const out = await createResume(
      { userid, filename, templateKey, lastSaved },
      resumedata
    );
    res.status(201).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/generate-resumeai", async (req, res) => {
  try {
    const { userid, Jobdata } = req.body || {};
    if (!userid || !Jobdata) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // scrub DB-only fields if Jobdata came from your collection
    const safeJob = { ...Jobdata };
    delete safeJob._id; delete safeJob.userId;
    delete safeJob.createdAt; delete safeJob.updatedAt; delete safeJob.__v;

    const ai = await GenerateResumeBasedOn(userid, safeJob, {
      temperature: 0.6,
      candidateCount: 3,
      maxBulletsPerRole: 5
    });

    if (ai.error) {
      const code = ai.error === "rate_limit" ? 429 : ai.error === "auth" ? 401 : 500;
      return res.status(code).json(ai);
    }
    return res.status(201).json(ai);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { filename, resumedata, lastSaved, templateKey, tags } = req.body || {};
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await updateResume(
      { resumeid: req.params.id, userid, filename, lastSaved, templateKey, tags },
      resumedata
    );
    if (out?.message) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const ok = await deleteResume({ resumeid: req.params.id, userid });
    if (!ok) return res.status(404).json({ error: "NotFound" });
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// SHARE create/update
router.post("/:id/share", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { resumedata } = req.body || {};
    if (!userid || !resumedata) return res.status(400).json({ error: "Missing fields" });

    const out = await createSharedResume({ userid, resumeid: req.params.id, resumedata });
    res.status(201).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// SHARE fetch
router.get("/shared/:sharedid", async (req, res) => {
  try {
    const out = await fetchSharedResume({ sharedid: req.params.sharedid });
    if (!out) return res.status(404).json({ error: "Share link invalid or expired" });
    res.status(200).json(out);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

export default router;
