// application/server/routes/certification-badge.js
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Certification } from "../models/Certification.js";
import { verifyJWT } from "../middleware/auth.js";

const router = Router();

// resolve uploads root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};
const ALL_EXTS = Object.values(EXT_BY_MIME);

function ensureDir(p) {
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    if (!st.isDirectory())
      throw new Error(`Path exists and is not a directory: ${p}`);
  } else {
    fs.mkdirSync(p, { recursive: true });
  }
}

function getDirForCert(certId) {
  const dir = path.join(UPLOAD_ROOT, "certifications", certId);
  ensureDir(path.join(UPLOAD_ROOT));
  ensureDir(path.join(UPLOAD_ROOT, "certifications"));
  ensureDir(dir);
  return dir;
}

function buildRelativeUrl(certId, ext) {
  return `/uploads/certifications/${certId}/badge.${ext}`;
}

function deleteAllBadgeVariants(dir) {
  for (const ext of ALL_EXTS) {
    const p = path.join(dir, `badge.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

// 5MB limit, image-only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/gif"].includes(
      file.mimetype
    );
    cb(ok ? null : new Error("Invalid file type. Use JPG, PNG, or GIF."), ok);
  },
});

// helper: get user id from req like your other middleware
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

// POST /api/certifications/:id/badge
router.post("/:id/badge", verifyJWT, upload.single("badge"), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id: certId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Make sure this cert belongs to the user
    const cert = await Certification.findOne({ _id: certId, userId });
    if (!cert) {
      return res
        .status(404)
        .json({ error: "Certification not found or not owned by user" });
    }

    const mime = req.file.mimetype;
    const ext = EXT_BY_MIME[mime];
    if (!ext) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const dir = getDirForCert(certId);
    deleteAllBadgeVariants(dir);

    let buffer;
    if (ext === "jpg") {
      buffer = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: "cover", position: "center" })
        .jpeg({ quality: 88 })
        .toBuffer();
    } else if (ext === "png") {
      buffer = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: "cover", position: "center" })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else {
      buffer = req.file.buffer; // gif
    }

    const filePath = path.join(dir, `badge.${ext}`);
    fs.writeFileSync(filePath, buffer);

    const relative = buildRelativeUrl(certId, ext);

    cert.badgeImageUrl = relative;
    await cert.save();

    const absolute = `${process.env.BASE || ""}${relative}`;
    return res.status(200).json({
      badgeImageUrl: relative,
      absoluteUrl: absolute,
    });
  } catch (e) {
    console.error("[certification-badge] upload error", e);
    return res
      .status(400)
      .json({ error: e?.message || "Badge upload failed" });
  }
});

export default router;
