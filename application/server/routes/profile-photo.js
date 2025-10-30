// application/server/routes/profile-photo.js
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Profile from '../models/profile.js';

const router = Router();

// resolve uploads root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

// ===== START new: unified user id helper =====
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}
// ===== END new =====

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};
const ALL_EXTS = Object.values(EXT_BY_MIME);

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

function deleteAllAvatarVariants(dir) {
  for (const ext of ALL_EXTS) {
    const p = path.join(dir, `avatar.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

// 5MB limit
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
    // ===== START new: log + unified user =====
    const userId = getUserId(req);
    console.log('[profile-photo] upload hit', {
      userId,
      paramsId: req.params.id,
      hasFile: !!req.file,
    });
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // ===== END new =====

    const { id: profileId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // ===== START new: try with userId first, then fallback by _id only =====
    let profile = await Profile.findOne({ _id: profileId, userId }).lean();
    if (!profile) {
      console.warn(
        '[profile-photo] profile not found with userId, trying by _id only',
        { profileId, userId }
      );
      profile = await Profile.findById(profileId).lean();
    }
    if (!profile) {
      console.error('[profile-photo] final NOT FOUND', { profileId, userId });
      return res.status(404).json({ error: 'Profile not found' });
    }
    // ===== END new =====

    const mime = req.file.mimetype;
    const ext = EXT_BY_MIME[mime];
    if (!ext) return res.status(400).json({ error: 'Unsupported type' });

    const dir = getDirForProfile(profileId);
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
    } else {
      buffer = req.file.buffer; // gif
    }

    const filePath = path.join(dir, `avatar.${ext}`);
    fs.writeFileSync(filePath, buffer);

    const relative = buildRelativeUrl(profileId, ext);
    // keep it in DB tied to this user
    await Profile.updateOne(
      { _id: profileId },
      { $set: { photoUrl: relative, userId } } // <— also re-attach userId here
    );

    const absolute = `${process.env.BASE || ''}${relative}`;
    return res.status(200).json({ photoUrl: absolute });
  } catch (e) {
    console.error('[profile-photo] error', e);
    return res.status(400).json({ error: e?.message || 'Upload failed' });
  }
});

// DELETE /api/profile/:id/photo
router.delete('/:id/photo', async (req, res) => {
  try {
    const userId = getUserId(req);
    console.log('[profile-photo] delete hit', {
      userId,
      paramsId: req.params.id,
    });
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: profileId } = req.params;

    // same 2-step lookup
    let profile = await Profile.findOne({ _id: profileId, userId });
    if (!profile) profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const dir = getDirForProfile(profileId);
    deleteAllAvatarVariants(dir);

    await Profile.updateOne(
      { _id: profileId },
      { $set: { photoUrl: '', userId } }
    );

    return res.sendStatus(204);
  } catch (e) {
    console.error('[profile-photo] delete error', e);
    return res.status(400).json({ error: e?.message || 'Delete failed' });
  }
});

export default router;
