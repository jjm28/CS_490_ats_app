import express from "express";
import Resume from "../models/resume.js";
import ResumeTemplate from "../models/resumeTemplate.js";
import { validate, createResumeZ, updateResumeZ } from "../validators/templates.js";
import { verifyJWT } from "../middleware/auth.js";

const r = express.Router();

function requireUserId(req, res) {
    const id = req.user?._id?.toString?.();
    if (!id) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }
    return id;
  }

// List my resumes
r.get("/", verifyJWT, async (req, res) => {
  const me = req.user._id;
  const list = await Resume.find({ ownerId: me, archived: false }).sort({ updatedAt: -1 });
  res.json(list);
});

// Create from template
r.post("/", verifyJWT, validate(createResumeZ), async (req, res) => {
  const me = requireUserId(req, res); if (!me) return;

  const rawName = (req.body.name || "").trim();
  const safeContent = req.body.content || {};

  // --- SCRATCH MODE: no templateId provided ---
  if (!req.body.templateId) {
    try {
      const doc = await Resume.create({
        name: rawName || "Untitled Resume",
        templateId: null,        // <- important: explicitly null for scratch
        ownerId: me,
        content: safeContent,
        tags: [],
        groupId: null,
        version: 1,
      });
      return res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "CreateFailed" });
    }
  }

  // --- TEMPLATE MODE (existing behavior) ---
  const tpl = await ResumeTemplate.findById(req.body.templateId);
  if (!tpl) return res.status(400).json({ error: "TemplateNotFound" });

  const allowed =
    tpl.origin === "system" ||
    tpl.ownerId?.toString() === me ||
    tpl.isShared ||
    (tpl.sharedWith || []).some((u) => u?.toString() === me);

  if (!allowed) return res.status(403).json({ error: "ForbiddenTemplate" });

  const safeName =
    rawName.length > 0 ? rawName : `${tpl.name} Resume`;

  try {
    const doc = await Resume.create({
      name: safeName,
      templateId: tpl._id.toString(),
      ownerId: me,
      content: safeContent,
      tags: [],
      groupId: null,
      version: 1,
    });
    return res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "CreateFailed" });
  }
});


// Get one
r.get("/:id", verifyJWT, async (req, res) => {
  const doc = await Resume.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "NotFound" });
  if (doc.ownerId !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });
  res.json(doc);
});

// Update (rename/content/switch template)
r.put("/:id", verifyJWT, validate(updateResumeZ), async (req, res) => {
  const doc = await Resume.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "NotFound" });
  if (doc.ownerId !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });

  if (req.body.templateId) {
    const tpl = await ResumeTemplate.findById(req.body.templateId);
    if (!tpl) return res.status(400).json({ error: "TemplateNotFound" });

    const me = requireUserId(req, res); if (!me) return;
    const allowed =
      tpl.origin === "system" ||
      tpl.ownerId?.toString() === me ||
      tpl.isShared ||
      (tpl.sharedWith || []).some((u) => u?.toString() === me);
    if (!allowed) return res.status(403).json({ error: "ForbiddenTemplate" });

    doc.templateId = tpl._id.toString();
  }

  if (req.body.name !== undefined) doc.name = req.body.name;
  if (req.body.content !== undefined) doc.content = req.body.content;
  if (req.body.archived !== undefined) doc.archived = req.body.archived;

  await doc.save();
  res.json(doc);
});

r.post("/:id/duplicate", verifyJWT, async (req, res) => {    
  const src = await Resume.findById(req.params.id);
  if (!src) return res.status(404).json({ error: "NotFound" });
  if (src.ownerId !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });

  const clone = await Resume.create({
    name: `${src.name} (Copy)`,
    templateId: src.templateId,
    ownerId: src.ownerId,
    content: src.content,
    tags: src.tags || [],
    groupId: src.groupId || src._id.toString(), 
    version: (src.version || 1) + 1,
  });
  res.status(201).json(clone);
});

// Delete (hard delete; swap to archive if you prefer)
r.delete("/:id", verifyJWT, async (req, res) => {
  const doc = await Resume.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "NotFound" });
  if (doc.ownerId !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });
  await doc.deleteOne();
  res.status(204).end();
});

export default r;
