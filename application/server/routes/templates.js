// routes/templates.js
import express from "express";
import { getDb } from "../db/connection.js";

const router = express.Router();


import { verifyJWT } from "../middleware/auth.js";
router.use(verifyJWT);

/** List all resume templates visible to the user */
router.get("/", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing userid" });

    const db = getDb();

    // System + user templates; normalize to a single shape
    const sys = await db.collection("resumetemplates").find({ origin: "system" }).toArray();
    const user = await db.collection("resumetemplates").find({ owner: userid }).toArray();

    const out = [...sys, ...user].map(t => ({
      _id: String(t._id),
      templateKey: t.type,            // chronological | functional | hybrid
      title: t.title || t.type,
      blurb: t.description || t.blurb || "",
      img: t.image || t.img || null,
    }));

    return res.status(200).json(out);
  } catch (e) {
    console.error("list templates error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** Get default template for a user */
router.get("/default", async (req, res) => {
  try {
    const { userid } = req.query;
    if (!userid) return res.status(400).json({ error: "Missing userid" });

    const db = getDb();
    const def = await db.collection("resumeTemplateDefaults").findOne({ userId: userid });

    return res.status(200).json({ templateKey: def?.templateKey ?? null });
  } catch (e) {
    console.error("get default error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** Set default template for a user */
router.post("/default", async (req, res) => {
  try {
    const { userid, templateKey } = req.body || {};
    if (!userid || !templateKey) return res.status(400).json({ error: "Missing fields" });

    const db = getDb();
    await db.collection("resumeTemplateDefaults").updateOne(
      { userId: userid },
      { $set: { userId: userid, templateKey } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("set default error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** (Optional) Create a user template */
router.post("/", async (req, res) => {
  try {
    const { userid, title, templateKey, style } = req.body || {};
    if (!userid || !title || !templateKey) return res.status(400).json({ error: "Missing fields" });

    const db = getDb();
    const ins = await db.collection("resumetemplates").insertOne({
      owner: userid,
      origin: "user",
      title,
      type: templateKey,
      style: style || {},
    });

    return res.status(201).json({ _id: ins.insertedId });
  } catch (e) {
    console.error("create template error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
