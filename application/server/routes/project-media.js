import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getDirForProject(projectId) {
  const dir = path.join(UPLOAD_ROOT, "projects", projectId);
  ensureDir(dir);
  return dir;
}

function buildRelativeUrl(projectId, filename) {
  return `uploads/projects/${projectId}/${filename}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const { id: projectId } = req.params;
      const dir = getDirForProject(projectId);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `media${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Invalid file type. Use JPG, PNG, or GIF."), ok);
  },
});

// ✅ Upload project screenshot
router.post("/:id/media", upload.single("file"), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const relativeUrl = buildRelativeUrl(projectId, req.file.filename);
    const absoluteUrl = `${process.env.BASE || "http://localhost:5050"}${relativeUrl}`;

    const db = getDb();
    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { mediaUrl: relativeUrl } }
    );

    res.json({ url: absoluteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// ✅ Delete uploaded screenshot
router.delete("/:id/media", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const dir = getDirForProject(projectId);

    // Delete media.* files in folder
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    for (const file of files) {
      if (file.startsWith("media.")) fs.unlinkSync(path.join(dir, file));
    }

    const db = getDb();
    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { mediaUrl: "" } }
    );

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message || "Delete failed" });
  }
});

export default router;