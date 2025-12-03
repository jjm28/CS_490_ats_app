// routes/jobs.js
import mongoose from "mongoose";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";
import { verifyJWT } from "../middleware/auth.js";
import {
  validateJobCreate,
  validateJobUpdate,
  validateStatusUpdate,
  validateBulkStatusUpdate
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
  getJobStats
} from "../services/jobs.service.js";
import {
  getUserPreferences,
  saveLastSearch,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  deleteUserPreferences
} from "../services/userpreferences.service.js";
import Jobs from "../models/jobs.js";
import { validateJobImport } from '../validators/jobimport.js';
import { scrapeJobFromUrl } from '../services/jobscraper.service.js';
import { calculateJobMatch } from "../__tests__/services/matchAnalysis.service.js";
import { getSkillsByUser } from "./skills.js";
import { incrementApplicationGoalsForUser } from "../services/jobSearchSharing.service.js";
const router = Router();

const VALID_STATUSES = ["interested", "applied", "phone_screen", "interview", "offer", "rejected"];

// ============================================
// AUTH + UTIL HELPERS
// ============================================

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

function getDevId(req) {
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

    // Return empty object with empty arrays if no preferences saved
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
      search
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
      searchId: req.params.searchId
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

    if (!deleted) {
      return res.status(404).json({ error: "No preferences found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting preferences:", err);
    res.status(500).json({ error: err?.message || "Failed to delete preferences" });
  }
});

// ============================================
// JOB ROUTES
// ============================================

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const r = await validateJobCreate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);
    const created = await createJob({ userId, payload: r.value });
    // increment goals that are are application unit (intuitive logic)
    try {
      await incrementApplicationGoalsForUser(String(userId), `New job added: ${created.jobTitle || ""}`);
    } catch (err) {
      console.error("Error auto-incrementing application goals:", err);
      // don't throw: job creation should still succeed even if this fails
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Create failed" });
  }
});

// ============================================
// GET ALL JOBS (with matchScore + skill matching)
// ============================================

// ============================================
// GET ALL JOBS (with matchScore + skill matching)
// ============================================

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Build query: only non-archived jobs
    const query = { userId, archived: { $ne: true } };

    const statusParam = req.query.status;
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam)) {
        return res.status(400).json({
          error: "Invalid status value",
          validStatuses: VALID_STATUSES
        });
      }
      query.status = statusParam;
    }

    // Fetch jobs sorted by newest
    const jobs = await Jobs.find(query).sort({ createdAt: -1 }).lean();

    // Fetch user skills
    const userSkills = await getSkillsByUser(userId);
    const skillNames = userSkills.map(s => s.name.toLowerCase());

    // Enhance jobs with matchScore and skill comparisons
    const enhancedJobs = jobs.map(job => {
      const jobSkills = job.requiredSkills?.map(s => s.toLowerCase()) || [];
      const skillsMatched = jobSkills.filter(skill => skillNames.includes(skill));
      const skillsMissing = jobSkills.filter(skill => !skillNames.includes(skill));

      const matchScore = jobSkills.length
        ? Math.round((skillsMatched.length / jobSkills.length) * 100)
        : 0;

      return {
        ...job,
        matchScore,
        skillsMatched,
        skillsMissing,
      };
    });

    return res.json(enhancedJobs);

  } catch (err) {
    console.error("Get jobs failed:", err);
    res.status(500).json({ error: err?.message || "Get jobs failed" });
  }
});

// ✅ Get archived jobs
router.get("/archived", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      console.error("No userId found in /archived");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const jobs = await Jobs.find({
      userId,
      archived: true,
    }).sort({ archivedAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error("Get archived jobs failed:", err);
    res.status(500).json({ error: err.message || "Failed to get archived jobs" });
  }
});

// /api/jobs/stats
router.get("/stats", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const stats = await getJobStats(userId);
    res.json(stats);
  } catch (err) {
    console.error("Stats generation failed:", err);
    res.status(500).json({ error: err.message || "Failed to get job stats" });
  }
});


/**
 * POST /api/jobs/import-from-url
 * Import job data from a job posting URL
 * Place this route BEFORE the router.get("/:id") route to avoid conflicts
 */
router.post("/import-from-url", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await validateJobImport(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    const result = await scrapeJobFromUrl(r.value.url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        status: result.status,
        error: result.error || 'Failed to import job data',
        data: result.data,
        jobBoard: result.jobBoard
      });
    }

    res.json({
      success: true,
      status: result.status,
      data: result.data,
      jobBoard: result.jobBoard,
      extractedFields: result.extractedFields,
      message: result.status === 'success'
        ? 'Job data imported successfully'
        : 'Partial data imported - please review and complete missing fields'
    });
  } catch (err) {
    console.error('Error importing job from URL:', err);
    res.status(500).json({
      success: false,
      status: 'failed',
      error: err?.message || "Failed to import job data"
    });
  }
});

// ============================================
// INTERVIEW ROUTES (UC-071)
// ============================================

router.post("/:id/interview", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { type, date, locationOrLink, notes, interviewer, contactInfo, confidenceLevel, anxietyLevel } = req.body;
    if (!type || !date) return res.status(400).json({ error: "Type and date are required" });
    const job = await Jobs.findOne({ _id: req.params.id, userId });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const interview = {
      _id: new mongoose.Types.ObjectId(),
      type,
      date,
      locationOrLink,
      notes,
      interviewer,
      contactInfo,
      confidenceLevel,
      anxietyLevel,
      outcome: "pending",
      reminderSent: false
    };
    job.interviews.push(interview);
    await job.save();
    res.status(201).json(job.interviews);
  } catch (err) {
    console.error("Error scheduling interview:", err);
    res.status(500).json({ error: err.message || "Failed to schedule interview" });
  }
});

router.get("/:id/interview", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const job = await Jobs.findOne({ _id: req.params.id, userId }).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job.interviews || []);
  } catch (err) {
    console.error("Error fetching interviews:", err);
    res.status(500).json({ error: err.message || "Failed to fetch interviews" });
  }
});

router.put("/:id/interview/:interviewId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { id, interviewId } = req.params;
    const { type, date, locationOrLink, notes, interviewer, contactInfo, confidenceLevel, anxietyLevel, outcome } = req.body;
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const interview = job.interviews.find(i => i._id.toString() === interviewId);
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    if (type !== undefined) interview.type = type;
    if (date !== undefined) interview.date = date;
    if (locationOrLink !== undefined) interview.locationOrLink = locationOrLink;
    if (notes !== undefined) interview.notes = notes;
    if (interviewer !== undefined) interview.interviewer = interviewer;
    if (contactInfo !== undefined) interview.contactInfo = contactInfo;
    if (confidenceLevel !== undefined) interview.confidenceLevel = confidenceLevel;
    if (anxietyLevel !== undefined) interview.anxietyLevel = anxietyLevel;
    if (outcome !== undefined) interview.outcome = outcome;
    await job.save();
    res.json(interview);
  } catch (err) {
    console.error("Error updating interview:", err);
    res.status(500).json({ error: err.message || "Failed to update interview" });
  }
});

router.delete("/:id/interview/:interviewId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { id, interviewId } = req.params;
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return res.status(404).json({ error: "Job not found" });
    job.interviews = job.interviews.filter(i => i._id.toString() !== interviewId);
    await job.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting interview:", err);
    res.status(500).json({ error: err.message || "Failed to delete interview" });
  }
});

// ✅ PATCH: Save Google Calendar eventId
router.patch("/:id/interview/eventId", async (req, res) => {
  try {
    const { interviewId, eventId } = req.body;
    const job = await Jobs.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const interview = job.interviews.id(interviewId);
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    interview.eventId = eventId;
    await job.save();
    console.log(`✅ Event ID saved for interview ${interviewId}: ${eventId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save eventId:", err);
    res.status(500).json({ error: "Failed to save eventId" });
  }
});

// ============================================
// JOB DETAILS / HISTORY / STATUS / ARCHIVE
// ============================================

router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const devId = getDevId(req);
    let doc = await getJob({ userId, id: req.params.id });
    if (!doc && devId && devId !== userId) {
      doc = await getJob({ userId: devId, id: req.params.id });
      if (doc) {
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
    // ============================================================
    // ⭐ UC-100: Salary & Compensation History Tracking Logic
    // ============================================================
    {
      const jobDoc = await Jobs.findOne({ _id: req.params.id, userId });

      if (jobDoc) {
        // ---------- 1) SALARY HISTORY ----------
        if (r.value.finalSalary != null) {
          const previousFinal =
            jobDoc.salaryHistory?.length > 0
              ? jobDoc.salaryHistory[jobDoc.salaryHistory.length - 1].finalSalary
              : null;

          if (Number(r.value.finalSalary) !== previousFinal) {
            jobDoc.salaryHistory = jobDoc.salaryHistory || [];
            jobDoc.salaryHistory.push({
              finalSalary: Number(r.value.finalSalary),
              negotiationOutcome: r.value.negotiationOutcome || "Not attempted",
              date: new Date(),
            });
          }
        }

        // ---------- 2) TOTAL COMPENSATION HISTORY ----------
        const finalSalary =
          r.value.finalSalary ?? jobDoc.finalSalary ?? 0;

        const salaryBonus =
          r.value.salaryBonus ?? jobDoc.salaryBonus ?? 0;

        const salaryEquity =
          r.value.salaryEquity ?? jobDoc.salaryEquity ?? 0;

        const benefitsValue =
          r.value.benefitsValue ?? jobDoc.benefitsValue ?? 0;

        const newTotalComp =
          Number(finalSalary) +
          Number(salaryBonus) +
          Number(salaryEquity) +
          Number(benefitsValue);

        if (newTotalComp > 0) {
          jobDoc.compHistory = jobDoc.compHistory || [];

          const lastComp =
            jobDoc.compHistory.length > 0
              ? jobDoc.compHistory[jobDoc.compHistory.length - 1].totalComp
              : null;

          if (lastComp !== newTotalComp) {
            jobDoc.compHistory.push({
              totalComp: newTotalComp,
              date: new Date(),
            });
          }
        }

        await jobDoc.save();
      }
    }
    let updated = await updateJob({ userId, id: req.params.id, payload: r.value });
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

router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    let removed = await deleteJob({ userId, id: req.params.id });
    const devId = getDevId(req);
    if (!removed && devId && devId !== userId) {
      removed = await deleteJob({ userId: devId, id: req.params.id });
    }
    if (!removed) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Delete failed" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const r = await validateStatusUpdate(req.body);
    if (!r.ok) return res.status(r.status).json(r.error);

    let updated = await updateJobStatus({
      userId,
      id: req.params.id,
      status: r.value.status,
      note: r.value.note
    });

    // ✅ Append to statusHistory *only if not already the latest status*
    if (updated) {
      const jobDoc = await Jobs.findById(req.params.id);
      if (jobDoc) {
        jobDoc.statusHistory = jobDoc.statusHistory || [];

        const lastStatus = jobDoc.statusHistory[jobDoc.statusHistory.length - 1];
        if (!lastStatus || lastStatus.status !== r.value.status) {
          jobDoc.statusHistory.push({
            status: r.value.status,
            timestamp: new Date()  // Use consistent key name: 'timestamp'
          });
          await jobDoc.save();
        }
      }
    }

    // ⭐ AUTO-SYNC INTERVIEW OUTCOME BASED ON JOB STATUS ⭐
    if (updated) {
      const jobDoc = await Jobs.findById(req.params.id);

      if (jobDoc && jobDoc.interviews && jobDoc.interviews.length > 0) {
        const lastInterview = jobDoc.interviews[jobDoc.interviews.length - 1];

        // If user moves job → OFFER, mark last interview as "offer" (if still pending)
        if (r.value.status === "offer" && lastInterview.outcome === "pending") {
          lastInterview.outcome = "offer";
        }

        // If user moves job → REJECTED, mark last interview as "rejected" (if pending)
        if (r.value.status === "rejected" && lastInterview.outcome === "pending") {
          lastInterview.outcome = "rejected";
        }

        await jobDoc.save();
      }
    }

    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await updateJobStatus({
        userId: devId,
        id: req.params.id,
        status: r.value.status,
        note: r.value.note
      });
      if (updated) {
        await updateJob({
          userId: devId,
          id: req.params.id,
          payload: { userId }
        });
      }
    }

    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Status update failed" });
  }
});

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
      note: r.value.note
    });
    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      jobs: result.jobs
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Bulk update failed" });
  }
});

router.post("/:id/history", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { action } = req.body;
    if (!action || typeof action !== "string" || action.trim().length === 0)
      return res.status(400).json({ error: "Action is required" });
    if (action.length > 200)
      return res.status(400).json({ error: "Action must be 200 characters or less" });
    let updated = await addApplicationHistory({ userId, id: req.params.id, action });
    const devId = getDevId(req);
    if (!updated && devId && devId !== userId) {
      updated = await addApplicationHistory({ userId: devId, id: req.params.id, action });
      if (updated)
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
    }
    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error adding history entry:", err);
    res.status(500).json({ error: err?.message || "Failed to add history entry" });
  }
});

/**
 * POST /api/jobs/:id/analyze-match
 * Calculate match score for a specific job based on user's skills
 */
// Inside routes/jobs.js, within the POST /:id/analyze-match handler
router.post('/:id/analyze-match', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const jobId = req.params.id;
    const { weights = { skills: 0.6, experience: 0.3, education: 0.1 } } = req.body;

    // 1. Fetch job (using your existing service function)
    // Try with real user first
    let job = await getJob({ userId, id: jobId });

    // Legacy fallback (if applicable)
    const devId = getDevId(req);
    if (!job && devId && devId !== userId) {
      job = await getJob({ userId: devId, id: jobId });
      if (job) {
        // Migrate ownership if found under old ID
        await updateJob({ userId: devId, id: jobId, payload: { userId } });
        job.userId = userId;
      }
    }

    if (!job) return res.status(404).json({ error: 'Job not found' });

    // 2. Fetch user's skills (using getDb and NEW ObjectId)
    const db = getDb(); // Ensure getDb is available here, maybe import it too if not
    // Use the imported ObjectId with 'new' to convert the string userId and jobId
    const userSkills = await db.collection('skills').find({ userId }).toArray();

    // 3. Calculate match score (using the service function)
    const analysis = calculateJobMatch(job, userSkills, weights); // Call the service function

    // 4. Update the job object in the database with the new analysis
    const updateResult = await db.collection('jobs').updateOne(
      { _id: new ObjectId(jobId), userId }, // Use NEW ObjectId here
      {
        $set: {
          matchScore: analysis.matchScore,
          matchBreakdown: analysis.breakdown,
          skillGaps: analysis.skillGaps,
          matchedSkills: analysis.matchedSkills,
          suggestions: analysis.suggestions,
          matchTimestamp: new Date()
        },
        $push: {
          matchHistory: {
            $each: [{
              score: analysis.matchScore,
              breakdown: analysis.breakdown,
              skillGaps: analysis.skillGaps,
              matchedSkills: analysis.matchedSkills,
              suggestions: analysis.suggestions,
              timestamp: new Date()
            }],
            $slice: -20 // Keep only the last 20 analyses
          }
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Job not found or unauthorized for update' });
    }

    // 5. Fetch and return the updated job
    const updatedJob = await getJob({ userId, id: jobId });
    res.json(updatedJob);

  } catch (err) {
    console.error('Error analyzing job match:', err);
    res.status(500).json({ error: err?.message || 'Match analysis failed' });
  }
});


/**
 * PUT /api/jobs/:id/history/:historyIndex
 * Edit an application history entry
 */
router.put('/:id/history/:historyIndex', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
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
      if (updated)
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
    }
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
      if (updated)
        await updateJob({ userId: devId, id: req.params.id, payload: { userId } });
    }
    if (!updated) return res.status(404).json({ error: "Job or history entry not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error deleting history entry:", err);
    res.status(500).json({ error: err?.message || "Failed to delete history entry" });
  }
});

// ✅ Archive or restore a job
router.patch("/:id/archive", async (req, res) => {
  try {
    const userId = getUserId(req); // ✅ real user ID extraction
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { archive, reason } = req.body;

    console.log(`[PATCH /api/jobs/${id}/archive] archive=${archive}, reason=${reason}`);

    const updated = await Jobs.findOneAndUpdate(
      { _id: id, userId }, // ✅ ensure user match
      {
        archived: archive,
        archiveReason: archive ? reason || "User action" : null,
        archivedAt: archive ? new Date() : null,
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Job not found" });

    res.json(updated);
  } catch (err) {
    console.error("Archive update failed:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;