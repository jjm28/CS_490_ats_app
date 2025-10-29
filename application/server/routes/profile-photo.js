// application/server/routes/profile-photo.js (ESM)
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Profile from '../models/profile.js';

const router = Router();

// ----- Resolve the SAME uploads root used by server.js -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads'); // server.js serves __dirname/../uploads

// ----- Helpers -----
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};
const ALL_EXTS = Object.values(EXT_BY_MIME); // ['jpg','png','gif']

function ensureDir(p) {
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    if (!st.isDirectory()) throw new Error(`Path exists and is not a directory: ${p}`);
  } else {
    fs.mkdirSync(p, { recursive: true });
  }
}

function getDirForProfile(profileId) {
  const dir = path.join(UPLOAD_ROOT, 'profiles', profileId);
  ensureDir(path.join(UPLOAD_ROOT));
  ensureDir(path.join(UPLOAD_ROOT, 'profiles'));
  ensureDir(dir);
  return dir;
}

function buildRelativeUrl(profileId, ext) {
  return `/uploads/profiles/${profileId}/avatar.${ext}`;
}

function findExistingAvatarPath(dir) {
  
  for (const ext of ALL_EXTS) {
    const p = path.join(dir, `avatar.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function deleteAllAvatarVariants(dir) {
  for (const ext of ALL_EXTS) {
    const p = path.join(dir, `avatar.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

//5MB images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid file type. Use JPG, PNG, or GIF.'), ok);
  },
});

// POST /api/profile/:id/photo  
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user?.id; 
    const { id: profileId } = req.params;

    const profile = await Profile.findOne({ _id: profileId, userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const mime = req.file.mimetype;
    const ext = EXT_BY_MIME[mime];
    if (!ext) return res.status(400).json({ error: 'Unsupported type' });

    const dir = getDirForProfile(profileId);

    // Replace any previous avatar.* (switching formats should remove old)
    deleteAllAvatarVariants(dir);

    let buffer;
    if (ext === 'jpg') {
      buffer = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 88 })
        .toBuffer();
    } else if (ext === 'png') {
      buffer = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'center' })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else if (ext === 'gif') {
      // KEEP ORIGINAL BYTES (resizing animated GIFs is non-trivial)
      buffer = req.file.buffer;
     
    }

    const filePath = path.join(dir, `avatar.${ext}`);
    fs.writeFileSync(filePath, buffer);

    // Store URL
    const relative = buildRelativeUrl(profileId, ext);
    profile.photoUrl = relative;
    await profile.save();

    // Return URL
    const absolute = `${process.env.BASE || ''}${relative}`;
    return res.status(200).json({ photoUrl: absolute });
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Upload failed' });
  }
});

// DELETE /api/profile/:id/photo  (remove)
router.delete('/:id/photo', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: profileId } = req.params;

    const profile = await Profile.findOne({ _id: profileId, userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const dir = getDirForProfile(profileId);
    const existing = findExistingAvatarPath(dir);
    if (existing) fs.unlinkSync(existing);

    profile.photoUrl = '';
    await profile.save();

    return res.sendStatus(204);
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Delete failed' });
  }
});

export default router;
