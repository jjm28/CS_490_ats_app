import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  createResume,
  updateResume,
  getResume,
  deleteResume,
  createSharedResume,
  fetchSharedResume,
} from "../services/resume.service.js";

const router = express.Router();
router.use(verifyJWT);

// GET /api/resumes   or   /api/resumes?resumeid=...
router.get("/", async (req, res) => {
  try {
    const { userid, resumeid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing user" });
    const out = await getResume({ userid, resumeid });
    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/resumes/:id  (full doc)
router.get("/:id", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing user" });
    const out = await getResume({ userid, resumeid: req.params.id });
    if (!out) return res.status(404).json({ error: "NotFound" });
    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/resumes  (create)
router.post("/", async (req, res) => {
  try {
    const { userid, filename, templateKey, resumedata, lastSaved } = req.body || {};
    if (!userid || !filename || !templateKey || !resumedata)
      return res.status(400).json({ error: "Missing fields" });

    const out = await createResume({ userid, filename, templateKey, lastSaved }, resumedata);
    return res.status(201).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/resumes/:id  (update)
router.put("/:id", async (req, res) => {
  try {
    const { userid, filename, resumedata, lastSaved, templateKey, tags } = req.body || {};
    if (!userid) return res.status(400).json({ error: "Missing user" });

    const out = await updateResume(
      { resumeid: req.params.id, userid, filename, lastSaved, templateKey, tags },
      resumedata
    );
    if (out?.message) return res.status(404).json({ message: "Resume not found" });
    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/resumes/:id
router.delete("/:id", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing user" });
    const ok = await deleteResume({ resumeid: req.params.id, userid });
    if (!ok) return res.status(404).json({ error: "NotFound" });
    return res.sendStatus(204);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/resumes/:id/share
router.post("/:id/share", async (req, res) => {
  try {
    const { userid, resumedata } = req.body || {};
    if (!userid || !resumedata) return res.status(400).json({ error: "Missing fields" });
    const out = await createSharedResume({ userid, resumeid: req.params.id, resumedata });
    return res.status(201).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/resumes/shared/:sharedid
router.get("/shared/:sharedid", async (req, res) => {
  try {
    const out = await fetchSharedResume({ sharedid: req.params.sharedid });
    if (!out) return res.status(404).json({ error: "Share link invalid or expired" });
    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Share link invalid or expired" });
  }
});

export default router;
