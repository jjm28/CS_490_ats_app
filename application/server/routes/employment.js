// application/server/routes/employment.js
import { Router } from 'express';
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

function userFrom(req) {
  return req.user?.id || req.headers['x-dev-user-id'];
}

/**
 * GET /api/employment
 * List all employment entries for the current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = userFrom(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const items = await listEmployment(userId);
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * GET /api/employment/:id
 * Get a single employment entry (must belong to the current user)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = userFrom(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await getEmployment(userId, req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Fetch failed' });
  }
});

/**
 * POST /api/employment
 * Create a new employment entry
 */
router.post('/', async (req, res) => {
  try {
    const userId = userFrom(req);
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
 * Update an existing employment entry (partial update allowed)
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = userFrom(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await validateEmploymentUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const updated = await updateEmployment(userId, req.params.id, r.value);
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Update failed' });
  }
});

/**
 * DELETE /api/employment/:id
 * Remove an employment entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = userFrom(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const removed = await removeEmployment(userId, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Not found' });

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Delete failed' });
  }
});

export default router;
