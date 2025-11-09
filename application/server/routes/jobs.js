// routes/jobs.js
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";
import { validateJobCreate, validateJobUpdate } from "../validators/jobs.js";
import { 
    createJob, 
    getAllJobs, 
    getJob, 
    updateJob, 
    deleteJob 
} from "../services/jobs.service.js";

const router = Router();

// router.use(verifyJWT);

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

export default router;