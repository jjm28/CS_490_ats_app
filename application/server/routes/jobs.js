import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  validateJobCreate,
  validateJobUpdate,
  validateStatusUpdate,
  validateBulkStatusUpdate,
} from "../validators/jobs.js";
import { validateLastSearch, validateSavedSearch } from "../validators/userpreferences.js";
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
  deleteApplicationHistory,
  autoArchiveOldJobs,
  getJobStats,
} from "../services/jobs.service.js";
import {
  getUserPreferences,
  saveLastSearch,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  deleteUserPreferences,
} from "../services/userpreferences.service.js";

const router = Router();

const VALID_STATUSES = [
  "interested",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
];

// 🔐 Auth middleware
router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

// ============================================
// USER PREFERENCES ROUTES
// ============================================

router.get("/preferences", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const preferences = await getUserPreferences({ userId });
    res.json(preferences || { savedSearches: [], lastSearch: null });
  } catch (err) {
    console.error("Error getting preferences:", err);
    res.status(500).json({ error: err?.message || "Failed to get preferences" });
  }
});

router.put("/preferences/last", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateLastSearch(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const saved = await saveLastSearch({ userId, search: r.value });
    res.json(saved);
  } catch (err) {
    console.error("Error saving last search:", err);
    res.status(500).json({ error: err?.message || "Failed to save last search" });
  }
});

router.post("/preferences/saved", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateSavedSearch(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const { name, ...search } = r.value;
    const saved = await createSavedSearch({ userId, name, search });
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating saved search:", err);
    res.status(500).json({ error: err?.message || "Failed to create saved search" });
  }
});

router.put("/preferences/saved/:searchId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateSavedSearch(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const { name, ...search } = r.value;
    const updated = await updateSavedSearch({
      userId,
      searchId: req.params.searchId,
      name,
      search,
    });

    if (!updated) return res.status(404).json({ error: "Saved search not found" });

    res.json(updated);
  } catch (err) {
    console.error("Error updating saved search:", err);
    res.status(500).json({ error: err?.message || "Failed to update saved search" });
  }
});

router.delete("/preferences/saved/:searchId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const updated = await deleteSavedSearch({
      userId,
      searchId: req.params.searchId,
    });

    if (!updated) return res.status(404).json({ error: "Saved search not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting saved search:", err);
    res.status(500).json({ error: err?.message || "Failed to delete saved search" });
  }
});

router.delete("/preferences", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const deleted = await deleteUserPreferences({ userId });
    if (!deleted) return res.status(404).json({ error: "No preferences found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting preferences:", err);
    res.status(500).json({ error: err?.message || "Failed to delete preferences" });
  }
});

// ============================================
// JOB ROUTES
// ============================================

// 🟢 CREATE Job
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await validateJobCreate(req.body);
    if (!result.ok) return res.status(result.status).json(result.error);

    const created = await createJob({ userId, payload: result.value });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Create failed" });
  }
});

// 🟢 GET All Jobs
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const statusParam = req.query.status;
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam)) {
        return res.status(400).json({
          error: "Invalid status value",
          validStatuses: VALID_STATUSES,
        });
      }
      const jobs = await getJobsByStatus({ userId, status: statusParam });
      return res.json(jobs);
    }

    const jobs = await getAllJobs({ userId, filter: { archived: false } });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Get all jobs failed" });
  }
});

// 🟣 GET Archived Jobs
router.get("/archived", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const jobs = await getAllJobs({ userId, filter: { archived: true } });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Fetch archived jobs failed" });
  }
});

// 📊 GET Stats
router.get("/stats", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await autoArchiveOldJobs(userId);
    const stats = await getJobStats(userId);
    res.json(stats);
  } catch (err) {
    console.error("Stats generation failed:", err);
    res.status(500).json({ error: err?.message || "Stats generation failed" });
  }
});

// 🔹 GET Single Job
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const job = await getJob({ userId, id: req.params.id });
    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json(job);
  } catch (err) {
    console.error("Error fetching job:", err);
    res.status(500).json({ error: "Get job failed" });
  }
});

// ✏️ UPDATE Job
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await validateJobUpdate(req.body);
    if (!result.ok) return res.status(result.status).json(result.error);

    const updated = await updateJob({
      userId,
      id: req.params.id,
      payload: result.value,
    });

    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update job failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ❌ DELETE Job
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const deleted = await deleteJob({ userId, id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Job not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 🔁 PATCH Job Status (for drag/drop)
router.patch("/:id/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateStatusUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const updated = await updateJobStatus({
      userId,
      id: req.params.id,
      status: r.value.status,
      note: r.value.note,
    });

    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json(updated);
  } catch (err) {
    console.error("Status update failed:", err);
    res.status(500).json({ error: "Status update failed" });
  }
});

// 🔁 PATCH Bulk Status
router.patch("/bulk-status", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateBulkStatusUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const result = await bulkUpdateJobStatus({
      userId,
      jobIds: r.value.jobIds,
      status: r.value.status,
      note: r.value.note,
    });

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      jobs: result.jobs,
    });
  } catch (err) {
    console.error("Bulk update failed:", err);
    res.status(500).json({ error: "Bulk update failed" });
  }
});

// 📦 PATCH Archive / Restore Job
router.patch("/:id/archive", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { archive, reason } = req.body;
    const payload = archive
      ? {
          archived: true,
          archiveReason: reason || "User action",
          archivedAt: new Date(),
        }
      : { archived: false, archiveReason: null, archivedAt: null };

    const updated = await updateJob({ userId, id: req.params.id, payload });
    if (!updated) return res.status(404).json({ error: "Job not found" });

    res.json({
      success: true,
      message: archive ? "Archived" : "Restored",
      job: updated,
    });
  } catch (err) {
    console.error("Archive update failed:", err);
    res.status(500).json({ error: "Archive update failed" });
  }
});

// ===========================
// APPLICATION HISTORY ROUTES
// ===========================
router.post("/:id/history", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { action } = req.body;
    if (!action || typeof action !== "string" || action.trim().length === 0) {
      return res.status(400).json({ error: "Action is required" });
    }
    if (action.length > 200) {
      return res.status(400).json({ error: "Action must be 200 characters or less" });
    }

    const updated = await addApplicationHistory({ userId, id: req.params.id, action });
    if (!updated) return res.status(404).json({ error: "Job not found" });

    res.json(updated);
  } catch (err) {
    console.error("Error adding history entry:", err);
    res.status(500).json({ error: err?.message || "Failed to add history entry" });
  }
});

router.put("/:id/history/:historyIndex", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { action } = req.body;
    const historyIndex = parseInt(req.params.historyIndex);
    if (isNaN(historyIndex) || historyIndex < 0) {
      return res.status(400).json({ error: "Invalid history index" });
    }
    if (!action || typeof action !== "string" || action.trim().length === 0) {
      return res.status(400).json({ error: "Action is required" });
    }

    const updated = await updateApplicationHistory({
      userId,
      id: req.params.id,
      historyIndex,
      action,
    });

    if (!updated) return res.status(404).json({ error: "Job or history entry not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating history entry:", err);
    res.status(500).json({ error: err?.message || "Failed to update history entry" });
  }
});

router.delete("/:id/history/:historyIndex", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const historyIndex = parseInt(req.params.historyIndex);
    if (isNaN(historyIndex) || historyIndex < 0) {
      return res.status(400).json({ error: "Invalid history index" });
    }

    const updated = await deleteApplicationHistory({
      userId,
      id: req.params.id,
      historyIndex,
    });

    if (!updated) return res.status(404).json({ error: "Job or history entry not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error deleting history entry:", err);
    res.status(500).json({ error: err?.message || "Failed to delete history entry" });
  }
});

export default router;