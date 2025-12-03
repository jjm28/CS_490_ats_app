import express from "express";
import multer from "multer";
import { requireRole } from "../middleware/auth.js";
import { parseCsvToJobSeekerRows, bulkUpsertJobSeekers } from "../services/onboarding.service.js";
import {
  createJobSeekerInvite,
  getInviteByToken,
  acceptJobSeekerInvite,
} from "../services/jobSeekerInvite.service.js";
import {
  listJobSeekersForOrg,
  bulkUpdateJobSeekerDeletion,
  bulkAddJobSeekersToCohort,
} from "../services/enterprise.service.js";
import { addMembersToCohort } from "../services/cohort.service.js";
import Organization from "../models/Org/Organization.js"; // if you have it; else use placeholder orgName
import bcrypt from 'bcrypt';
import {
  getJobSeekerInviteByToken,
  
} from "../services/jobSeekerInvite.service.js";
import { getOrgAnalyticsOverview } from "../services/analytics.service.js";
import { importJobsFromHandshakeCsv,importStudentsFromHandshakeCsv } from "../services/handshake.service.js";
const router = express.Router();
const upload = multer();

// ALL enterprise routes require org_admin / super_admin
router.use(requireRole(["org_admin", "super_admin"]));


/**
 * GET /api/enterprise/analytics/overview
 * Query: from, to, cohortId
 */
router.get("/enterprise/analytics/overview", async (req, res) => {
  try {
    const { from, to, cohortId } = req.query;

    const organizationId = req.user.organizationId;
    const result = await getOrgAnalyticsOverview({
      organizationId,
      cohortId: cohortId || null,
      from,
      to,
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching analytics overview:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error fetching analytics" });
  }
});


router.get("/enterprise/jobseekers", async (req, res) => {
  try {
    const { search, includeDeleted, page, pageSize } = req.query;

    const result = await listJobSeekersForOrg({
      organizationId: req.user.organizationId,
      search,
      includeDeleted: includeDeleted === "true",
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });

    res.json(result);
  } catch (err) {
    console.error("Error listing job seekers:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error listing job seekers" });
  }
});

router.patch("/enterprise/jobseekers/deletion", async (req, res) => {
  try {
    const { userIds, isDeleted } = req.body;

    const result = await bulkUpdateJobSeekerDeletion({
      organizationId: req.user.organizationId,
      userIds,
      isDeleted: !!isDeleted,
    });

    res.json(result);
  } catch (err) {
    console.error("Error updating job seeker deletion:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error updating job seekers" });
  }
});

router.post("/enterprise/jobseekers/add-to-cohort", async (req, res) => {
  try {
    const { userIds, cohortId } = req.body;

    const result = await bulkAddJobSeekersToCohort({
      organizationId: req.user.organizationId,
      userIds,
      cohortId,
      addMembersToCohortFn: addMembersToCohort,
    });

    res.json(result);
  } catch (err) {
    console.error("Error bulk-adding to cohort:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error adding to cohort" });
  }
});

router.post(
  "/enterprise/onboarding/import",
  upload.single("file"),
  async (req, res) => {
    try {
      const cohortId = req.body.cohortId || null;
      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required" });
      }

      const rows = parseCsvToJobSeekerRows(req.file.buffer);
      const result = await bulkUpsertJobSeekers({
        organizationId: req.user.organizationId,
        rows,
        cohortId,
      });

      res.json(result);
    } catch (err) {
      console.error("Error importing job seekers:", err);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Server error importing job seekers" });
    }
  }
);

router.post("/enterprise/onboarding/invite", async (req, res) => {
  try {
    const { email, cohortId } = req.body;

    let orgName = "Your organization";
    if (req.user.organizationId) {
      const org = await Organization.findById(req.user.organizationId).lean().catch(() => null);
      if (org?.name) orgName = org.name;
    }

    const baseUrl =
      process.env.FRONTEND_BASE_URL || "http://localhost:5173";

    const invite = await createJobSeekerInvite({
      organizationId: req.user.organizationId,
      createdByUserId: req.user.id,
      email,
      cohortId,
      orgName,
      baseUrl,
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error("Error creating job seeker invite:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error creating invite" });
  }
});


/**
 * POST /api/integrations/handshake/import-students
 * Form-data: file (CSV)
 * Optional: ?cohortId=...
 */
router.post(
  "/integrations/handshake/import-students",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "CSV file is required" });
      }

      const organizationId = req.user.organizationId;
      const cohortId = req.query.cohortId || null;

      const result = await importStudentsFromHandshakeCsv({
        organizationId,
        cohortId,
        csvBuffer: req.file.buffer,
      });

      res.json({
        message: "Handshake students import completed",
        ...result,
      });
    } catch (err) {
      console.error("Error importing Handshake students:", err);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Server error importing students" });
    }
  }
);

/**
 * POST /api/integrations/handshake/import-jobs
 * Form-data: file (CSV)
 */
router.post(
  "/integrations/handshake/import-jobs",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "CSV file is required" });
      }

      const organizationId = req.user.organizationId;
      const ownerUserId = req.user.id;

      const result = await importJobsFromHandshakeCsv({
        organizationId,
        ownerUserId,
        csvBuffer: req.file.buffer,
      });

      res.json({
        message: "Handshake jobs import completed",
        ...result,
      });
    } catch (err) {
      console.error("Error importing Handshake jobs:", err);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Server error importing jobs" });
    }
  }
);



export default router;
