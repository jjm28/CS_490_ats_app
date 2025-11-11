// routes/jobs.js
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";
import { 
  validateJobCreate, 
  validateJobUpdate,
  validateStatusUpdate,
  validateBulkStatusUpdate
} from "../validators/jobs.js";
import { 
    createJob, 
    getAllJobs, 
    getJob, 
    updateJob, 
    deleteJob,
    getJobsByStatus,
    updateJobStatus,
    bulkUpdateJobStatus,
    addApplicationHistory,
    updateApplicationHistory,
    deleteApplicationHistory
} from "../services/jobs.service.js";

const router = Router();

const VALID_STATUSES = ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

router.use((req, res, next) => {
  if (req.headers['x-dev-user-id']) {
    // fake user for dev
    req.user = { _id: req.headers['x-dev-user-id'] };
    return next();
  }
  // otherwise run real JWT
  verifyJWT(req, res, next);
});

function getUserId(req) {
  // real logged-in user (preferred)
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();

  // DEV ONLY – fallback if you're running with no auth
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

function getDevId(req) {
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateJobCreate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const created = await createJob({ userId, payload: r.value });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Create failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Check if filtering by status
    const statusParam = req.query.status;
    
    if (statusParam) {
      // Validate status enum
      if (!VALID_STATUSES.includes(statusParam)) {
        return res.status(400).json({ 
          error: "Invalid status value",
          validStatuses: VALID_STATUSES
        });
      }
      
      const jobs = await getJobsByStatus({ userId, status: statusParam });
      return res.json(jobs);
    }

    const jobs = await getAllJobs({ userId });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Get all jobs failed" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const devId = getDevId(req);

    // 1) try with real user
    let doc = await getJob({ userId, id: req.params.id });

    // 2) if not found and we have a legacy dev id, try that and migrate
    if (!doc && devId && devId !== userId) {
      doc = await getJob({ userId: devId, id: req.params.id });
      if (doc) {
        // migrate owner
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
        doc.userId = userId;
      }
    }

    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Get job failed" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateJobUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    // 1) try update under real user
    let updated = await updateJob({ userId, id: req.params.id, payload: r.value });

    // 2) if not found, try legacy dev id and migrate
    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      const migrated = await updateJob({ 
        userId: devId, 
        id: req.params.id, 
        payload: { ...r.value, userId }
      });
      if (migrated) updated = migrated;
    }

    if (!updated) return res.status(404).json({ error: "Not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Update failed" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // try delete with real user
    let removed = await deleteJob({ userId, id: req.params.id });

    // legacy fallback
    const devId = getDevId(req);
    if (!removed && devId && devId !== userId) {
      removed = await deleteJob({ userId: devId, id: req.params.id });
    }

    if (!removed) return res.status(404).json({ error: 'Not found' });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Delete failed' });
  }
});

/**
 * PATCH /api/jobs/:id/status
 * Update the status of a single job
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await validateStatusUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    // Try with real user
    let updated = await updateJobStatus({
      userId,
      id: req.params.id,
      status: r.value.status,
      note: r.value.note
    });

    // Legacy fallback
    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await updateJobStatus({
        userId: devId,
        id: req.params.id,
        status: r.value.status,
        note: r.value.note
      });
      // Migrate ownership if found
      if (updated) {
        await updateJob({ 
          userId: devId, 
          id: req.params.id, 
          payload: { userId } 
        });
      }
    }

    if (!updated) return res.status(404).json({ error: 'Job not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Status update failed' });
  }
});

/**
 * PATCH /api/jobs/bulk-status
 * Update the status of multiple jobs at once
 */
router.patch('/bulk-status', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await validateBulkStatusUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const result = await bulkUpdateJobStatus({
      userId,
      jobIds: r.value.jobIds,
      status: r.value.status,
      note: r.value.note
    });

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      jobs: result.jobs
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Bulk update failed' });
  }
});

export default router;

/**
 * POST /api/jobs/:id/history
 * Add a new application history entry
 */
router.post('/:id/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action } = req.body;

    // Validation
    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (action.length > 200) {
      return res.status(400).json({ error: 'Action must be 200 characters or less' });
    }

    let updated = await addApplicationHistory({ userId, id: req.params.id, action });

    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await addApplicationHistory({ userId: devId, id: req.params.id, action });
      if (updated) {
        // Migrate ownership
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
      }
    }

    if (!updated) return res.status(404).json({ error: 'Job not found' });

    res.json(updated);
  } catch (err) {
    console.error('Error adding history entry:', err);
    res.status(500).json({ error: err?.message || 'Failed to add history entry' });
  }
});

/**
 * PUT /api/jobs/:id/history/:historyIndex
 * Edit an application history entry
 */
router.put('/:id/history/:historyIndex', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action } = req.body;
    const historyIndex = parseInt(req.params.historyIndex);

    if (isNaN(historyIndex) || historyIndex < 0) {
      return res.status(400).json({ error: 'Invalid history index' });
    }

    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (action.length > 200) {
      return res.status(400).json({ error: 'Action must be 200 characters or less' });
    }

    let updated = await updateApplicationHistory({ 
      userId, 
      id: req.params.id, 
      historyIndex, 
      action 
    });

    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await updateApplicationHistory({ 
        userId: devId, 
        id: req.params.id, 
        historyIndex, 
        action 
      });
      if (updated) {
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
      }
    }

    if (!updated) return res.status(404).json({ error: 'Job or history entry not found' });

    res.json(updated);
  } catch (err) {
    console.error('Error updating history entry:', err);
    res.status(500).json({ error: err?.message || 'Failed to update history entry' });
  }
});

/**
 * DELETE /api/jobs/:id/history/:historyIndex
 * Delete an application history entry
 */
router.delete('/:id/history/:historyIndex', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const historyIndex = parseInt(req.params.historyIndex);

    if (isNaN(historyIndex) || historyIndex < 0) {
      return res.status(400).json({ error: 'Invalid history index' });
    }

    let updated = await deleteApplicationHistory({ 
      userId, 
      id: req.params.id, 
      historyIndex 
    });

    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await deleteApplicationHistory({ 
        userId: devId, 
        id: req.params.id, 
        historyIndex 
      });
      if (updated) {
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
      }
    }

    if (!updated) return res.status(404).json({ error: 'Job or history entry not found' });

    res.json(updated);
  } catch (err) {
    console.error('Error deleting history entry:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete history entry' });
  }
});