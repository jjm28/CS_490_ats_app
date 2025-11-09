import express from "express";
import ResumeTemplate from "../models/resumeTemplate.js";
import { validate, createTemplateZ, updateTemplateZ } from "../validators/templates.js";
import { verifyJWT } from "../middleware/auth.js";
import Resume from "../models/resume.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import mongoose from "mongoose";

const TemplateDefaultSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, unique: true },
    templateId: { type: String, required: true },
  },
  { timestamps: true, collection: "template_defaults" }
);

const TemplateDefault =
  mongoose.models.TemplateDefault ||
  mongoose.model("TemplateDefault", TemplateDefaultSchema);

const r = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.join(__dirname, "..", "uploads", "templates");
fs.mkdirSync(uploadRoot, { recursive: true });

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((s) => (typeof s === "string" ? s : s?.key || s?.title || "section"))
    .filter(Boolean);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    cb(ok ? null : new Error("Only PDF or DOCX allowed"), ok);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ---------- LIST (system + mine + shared-with-me) ----------
r.get("/", verifyJWT, async (req, res) => {
  const userId = req.user?._id?.toString();

  const [list, pref] = await Promise.all([
    ResumeTemplate.find({
      $or: [
        { origin: "system" },
        { ownerId: userId },
        { isShared: true },
        { sharedWith: userId },
      ],
    }).sort({ updatedAt: -1 }),
    TemplateDefault.findOne({ userId }),
  ]);

  const defaultId = pref?.templateId || null;
  const out = list.map((doc) => {
    const o = doc.toObject();
    o.isDefaultForOwner = defaultId === doc._id.toString();
    return o;
  });

  res.json(out);
});

// ---------- CREATE ----------
r.post("/", verifyJWT, validate(createTemplateZ), async (req, res) => {
  const userId = req.user._id;
  const doc = await ResumeTemplate.create({
    ...req.body,
    ownerId: userId,
    origin: req.body.origin || "user",
  });
  res.status(201).json(doc);
});

// ---------- IMPORT (JSON payload) ----------
r.post("/import", verifyJWT, async (req, res) => {
  try {
    const me = req.user?._id?.toString();
    if (!me) return res.status(401).json({ error: "Unauthorized" });
    const { name, type = "custom", style = {}, layout = {}, previewHtml } = req.body || {};
    if (!name || typeof name !== "string")
      return res.status(400).json({ error: "NameRequired" });

    const s = (style && typeof style === "object") ? style : {};
    const l = (layout && typeof layout === "object") ? layout : {};
    l.sections = normalizeSections(l.sections || []);

    const doc = await ResumeTemplate.create({
      name: name.trim(),
      type,
      style: s,
      layout: l,
      previewHtml: previewHtml || null,
      origin: "user",
      ownerId: me,
      isShared: false,
      sharedWith: [],
      isDefaultForOwner: false,
    });

    return res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "CreateTemplateFailed" });
  }
});

// ---------- IMPORT FILE (PDF/DOCX via multipart) ----------
r.post("/import-file", verifyJWT, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "UploadFailed" });
    }
    try {
      const me = req.user?._id?.toString();
      if (!me) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: "NoFile" });

      const suggested = req.body?.name || req.file.originalname;
      const name = suggested.replace(/\.(pdf|docx)$/i, "");
      const fileUrl = `/uploads/templates/${path.basename(req.file.path)}`;

      const doc = await ResumeTemplate.create({
        name: name.trim(),
        type: "custom",
        style: {},
        layout: {},
        isFileTemplate: true,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileUrl,
        origin: "user",
        ownerId: me,
        isShared: false,
        sharedWith: [],
        isDefaultForOwner: false,
      });

      return res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "CreateTemplateFailed" });
    }
  });
});

// ---------- GET CURRENT DEFAULT (place this BEFORE /:id!) ----------
r.get("/default", verifyJWT, async (req, res) => {
  try {
    const me = req.user._id.toString();
    const pref = await TemplateDefault.findOne({ userId: me });
    if (!pref) return res.sendStatus(204);

    const tpl = await ResumeTemplate.findById(pref.templateId);
    if (!tpl) return res.sendStatus(204);

    res.json(tpl);
  } catch (err) {
    console.error("GET /templates/default error:", err);
    res.status(500).json({ error: "ServerError" });
  }
});

//  SET DEFAULT
r.post("/:id/default", verifyJWT, async (req, res) => {
  try {
    const me = req.user._id.toString();
    const t = await ResumeTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "NotFound" });

    // Allow defaulting system/shared/user-owned templates — but we do NOT modify the template doc.
    const allowed =
      t.origin === "system" ||
      (t.ownerId && t.ownerId.toString() === me) ||
      t.isShared ||
      (t.sharedWith || []).some((u) => u?.toString() === me);
    if (!allowed) return res.status(403).json({ error: "ForbiddenTemplate" });

    await TemplateDefault.updateOne(
      { userId: me },
      { $set: { templateId: t._id.toString() } },
      { upsert: true }
    );

    res.json({ ok: true, templateId: t._id.toString() });
  } catch (err) {
    console.error("POST /templates/:id/default error:", err);
    res.status(500).json({ error: "ServerError" });
  }
});

// ---------- READ ONE (access guard) ----------
r.get("/:id", verifyJWT, async (req, res) => {
  const t = await ResumeTemplate.findById(req.params.id);
  if (!t) return res.status(404).json({ error: "NotFound" });

  const me = req.user._id?.toString();
  const allowed =
    t.origin === "system" ||
    t.ownerId?.toString() === me ||
    t.isShared ||
    (t.sharedWith || []).some((u) => u?.toString() === me);

  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  res.json(t);
});

// ---------- UPDATE (owner only; system read-only) ----------
r.put("/:id", verifyJWT, validate(updateTemplateZ), async (req, res) => {
  const t = await ResumeTemplate.findById(req.params.id);
  if (!t) return res.status(404).json({ error: "NotFound" });
  const me = req.user._id?.toString();
  if (t.origin === "system") return res.status(400).json({ error: "SystemTemplateReadOnly" });
  if (t.ownerId?.toString() !== me) return res.status(403).json({ error: "Forbidden" });

  Object.assign(t, req.body);
  await t.save();
  res.json(t);
});

// ---------- DELETE (owner only; not system) ----------
r.delete("/:id", verifyJWT, async (req, res) => {
  const t = await ResumeTemplate.findById(req.params.id);
  if (!t) return res.status(404).json({ error: "NotFound" });

  const me = req.user._id?.toString();
  if (t.origin === "system") return res.status(400).json({ error: "SystemTemplateReadOnly" });
  if (t.ownerId?.toString() !== me) return res.status(403).json({ error: "Forbidden" });

  // Best-effort: delete uploaded file for file-based templates
  try {
    if (t.isFileTemplate && t.fileUrl) {
      const abs = path.join(uploadRoot, path.basename(t.fileUrl));
      if (abs.startsWith(uploadRoot) && fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }
  } catch (e) {
    console.warn("Failed to remove template file:", e?.message || e);
  }

  await t.deleteOne();
  res.status(204).end();
});

// ---------- CLONE (makes a user-owned copy) ----------
r.post("/:id/clone", verifyJWT, async (req, res) => {
  const src = await ResumeTemplate.findById(req.params.id);
  if (!src) return res.status(404).json({ error: "NotFound" });

  const me = req.user._id;
  const clone = await ResumeTemplate.create({
    name: `${src.name} (Copy)`,
    type: src.type,
    style: src.style,
    layout: src.layout,
    ownerId: me,
    origin: "user",
    isShared: false,
    sharedWith: [],
  });
  res.status(201).json(clone);
});

// ---------- SHARE ----------
r.post("/:id/share", verifyJWT, async (req, res) => {
  const me = req.user._id;
  const t = await ResumeTemplate.findById(req.params.id);
  if (!t) return res.status(404).json({ error: "NotFound" });
  if (t.ownerId?.toString() !== me.toString())
    return res.status(403).json({ error: "Forbidden" });

  const { isShared, sharedWith } = req.body || {};
  if (typeof isShared === "boolean") t.isShared = isShared;
  if (Array.isArray(sharedWith)) t.sharedWith = sharedWith;
  await t.save();
  res.json(t);
});

// ---------- IMPORT FROM RESUME (turn a resume into a template shell) ----------
r.post("/import-from-resume", verifyJWT, async (req, res) => {
  const { resumeId, name } = req.body || {};
  if (!resumeId || !name) {
    return res.status(400).json({ error: "resumeId and name are required" });
  }
  const me = req.user._id?.toString();
  const resume = await Resume.findById(resumeId);
  if (!resume) return res.status(404).json({ error: "ResumeNotFound" });
  if (resume.ownerId !== me) return res.status(403).json({ error: "Forbidden" });

  const style = resume.content?.style || { primary: "#0ea5e9", font: "Inter" };
  const layout = resume.content?.layout || { columns: 1, sections: [] };

  const tpl = await ResumeTemplate.create({
    name,
    type: "custom",
    style,
    layout,
    ownerId: me,
    origin: "import",
    isShared: false,
  });

  res.status(201).json(tpl);
});

export default r;
