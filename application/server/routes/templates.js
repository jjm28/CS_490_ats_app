import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";

const router = express.Router();
router.use(verifyJWT);

// GET /api/resume-templates
router.get("/resume-templates", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing user" });
    const db = getDb();

    const list = await db
      .collection("resumeTemplates")
      .find({ $or: [{ owner: userid }, { origin: "system" }] })
      .sort({ origin: -1, updatedAt: -1 })
      .toArray();

    res.json(
      list.map((t) => ({
        _id: t._id,
        title: t.title,
        templateKey: t.type,
        owner: t.owner || "system",
        style: t.style || {},
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/resume-templates
router.post("/resume-templates", async (req, res) => {
  try {
    const { userid, title, templateKey, style } = req.body || {};
    if (!userid || !title || !templateKey) return res.status(400).json({ error: "Missing fields" });
    const db = getDb();
    const ins = await db
      .collection("resumeTemplates")
      .insertOne({ owner: userid, origin: "user", title, type: templateKey, style: style || {} });
    res.status(201).json({ templateId: ins.insertedId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/resume-templates/:id/share  (stub)
router.post("/resume-templates/:id/share", async (_req, res) => res.json({ ok: true }));

// GET /api/resume-templates/default
router.get("/resume-templates/default", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing user" });
    const db = getDb();

    const pref = await db.collection("resumeTemplateDefaults").findOne({ userId: userid });
    if (!pref) return res.status(204).end();

    const tpl = await db.collection("resumeTemplates").findOne({ _id: pref.templateId });
    if (!tpl) return res.status(204).end();

    res.json({ templateKey: tpl.type });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/resume-templates/default
router.post("/resume-templates/default", async (req, res) => {
  try {
    const { userid, templateKey } = req.body || {};
    if (!userid || !templateKey) return res.status(400).json({ error: "Missing fields" });

    const db = getDb();
    const tpl = await db
      .collection("resumeTemplates")
      .findOne({ $or: [{ owner: userid }, { origin: "system" }], type: templateKey });

    if (!tpl) return res.status(400).json({ error: "TemplateNotFound" });

    await db
      .collection("resumeTemplateDefaults")
      .updateOne({ userId: userid }, { $set: { templateId: tpl._id } }, { upsert: true });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
