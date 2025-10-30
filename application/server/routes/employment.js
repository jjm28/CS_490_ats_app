// application/server/routes/employment.js
import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js'; 
import {
  validateEmploymentCreate,
  validateEmploymentUpdate,
} from '../validators/employment.js';
import {
  listEmployment,
  createEmployment,
  getEmployment,
  updateEmployment,
  removeEmployment,
} from '../services/employment.service.js';

const router = Router();


router.use(verifyJWT);



function getUserId(req) {
  // real logged-in user (preferred)
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();

  // DEV ONLY – fallback if you’re running with no auth
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}

function getDevId(req) {
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}


/**
 * GET /api/employment
 * List all employment entries for the current user.
 * ALSO: if there are old rows saved under the dev id, reattach them.
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const devId = getDevId(req);

    // pull everything that could belong to this browser/user
    
    let items = await listEmployment({
      orUserIds: devId && devId !== userId ? [userId, devId] : [userId],
    });

    // if we found legacy rows under devId but we have a real user,
    // migrate them so next time it’s clean
    if (devId && devId !== userId) {
      const legacy = items.filter((x) => x.userId === devId);
      if (legacy.length > 0) {
        await Promise.all(
          legacy.map((row) =>
            updateEmployment(userId, row._id.toString(), {
              // only change owner
              userId,
            })
          )
        );
        // re-read under real user so what we return is consistent
        items = await listEmployment({ orUserIds: [userId] });
      }
    }

    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * GET /api/employment/:id
 * must belong to this user (with legacy fallback)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const devId = getDevId(req);

    // 1) try with real user
    let doc = await getEmployment(userId, req.params.id);

    // 2) if not found and we have a legacy dev id, try that and migrate
    if (!doc && devId && devId !== userId) {
      doc = await getEmployment(devId, req.params.id);
      if (doc) {
        // migrate owner
        await updateEmployment(userId, req.params.id, { userId });
        doc.userId = userId;
      }
    }

    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * POST /api/employment
 * Create a new employment entry, always saving under the real user if present.
 */
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await validateEmploymentCreate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const created = await createEmployment(userId, r.value);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Create failed' });
  }
});

/**
 * PUT /api/employment/:id
 * Update an existing employment entry (with legacy fallback)
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await validateEmploymentUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    // 1) try update under real user
    let updated = await updateEmployment(userId, req.params.id, r.value);

    // 2) if not found, try legacy dev id and migrate
    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      const migrated = await updateEmployment(devId, req.params.id, {
        ...r.value,
        userId,
      });
      if (migrated) updated = migrated;
    }

    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Update failed' });
  }
});

/**
 * DELETE /api/employment/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // try delete with real user
    let removed = await removeEmployment(userId, req.params.id);

    // legacy fallback
    const devId = getDevId(req);
    if (!removed && devId && devId !== userId) {
      removed = await removeEmployment(devId, req.params.id);
    }

    if (!removed) return res.status(404).json({ error: 'Not found' });

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Delete failed' });
  }
});

export default router;
