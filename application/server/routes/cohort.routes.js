// routes/cohort.routes.js
import express from "express";
import {
  createCohort,
  listCohorts,
  getCohort,
  updateCohort,
  archiveCohort,
  listCohortMembers,
  addMembersToCohort,
  removeMembersFromCohort,
} from "../services/cohort.service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { searchJobSeekers } from "../services/enterprise.service.js"
const router = express.Router();

// All cohort routes require auth + org_admin or super_admin
router.use(requireRole(["org_admin", "super_admin"]));
/**
 * GET /api/enterprise/cohorts
 * Query: status, search, page, pageSize
 */
router.get("/cohorts", async (req, res) => {
  try {
    const { status, search, page, pageSize } = req.query;
    console.log(req.user)
    const result = await listCohorts({
      organizationId: req.user.organizationId,
      status,
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });

    res.json(result);
  } catch (err) {
    console.error("Error listing cohorts:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error listing cohorts" });
  }
});

/**
 * POST /api/enterprise/cohorts
 */
router.post("/cohorts", async (req, res) => {
  try {
    const { name, description, tags } = req.body;

    const cohort = await createCohort({
      organizationId: req.user.organizationId,
      createdByUserId: req.user.id,
      name,
      description,
      tags,
    });

    res.status(201).json(cohort);
  } catch (err) {
    console.error("Error creating cohort:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error creating cohort" });
  }
});

/**
 * GET /api/enterprise/cohorts/:cohortId
 */
router.get("/cohorts/:cohortId", async (req, res) => {
  try {
    const { cohortId } = req.params;

    const cohort = await getCohort({
      cohortId,
      organizationId: req.user.organizationId,
    });

    res.json(cohort);
  } catch (err) {
    console.error("Error fetching cohort:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error fetching cohort" });
  }
});

/**
 * PATCH /api/cohorts/:cohortId
 */
router.patch("/cohorts/:cohortId", async (req, res) => {
  try {
    const { cohortId } = req.params;

    const cohort = await updateCohort({
      cohortId,
      organizationId: req.user.organizationId,
      updates: req.body,
    });

    res.json(cohort);
  } catch (err) {
    console.error("Error updating cohort:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error updating cohort" });
  }
});

/**
 * POST /api/cohorts/:cohortId/archive
 */
router.post("/cohorts/:cohortId/archive", async (req, res) => {
  try {
    const { cohortId } = req.params;

    const cohort = await archiveCohort({
      cohortId,
      organizationId: req.user.organizationId,
    });

    res.json(cohort);
  } catch (err) {
    console.error("Error archiving cohort:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error archiving cohort" });
  }
});

/**
 * GET /api/enterprise/cohorts/:cohortId/members
 * Query: search, page, pageSize
 */
router.get("/cohorts/:cohortId/members", async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { search, page, pageSize } = req.query;

    const result = await listCohortMembers({
      cohortId,
      organizationId: req.user.organizationId,
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 25,
    });

    res.json(result);
  } catch (err) {
    console.error("Error listing cohort members:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error listing cohort members" });
  }
});

/**
 * POST /api/enterprise/cohorts/:cohortId/members
 * Body: { jobSeekerUserIds: string[] }
 */
router.post("/cohorts/:cohortId/members", async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { jobSeekerUserIds } = req.body;

    const result = await addMembersToCohort({
      cohortId,
      organizationId: req.user.organizationId,
      jobSeekerUserIds,
      source: "manual",
    });

    res.json(result);
  } catch (err) {
    console.error("Error adding cohort members:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error adding cohort members" });
  }
});

/**
 * DELETE /api/enterprise/cohorts/:cohortId/members
 * Body: { jobSeekerUserIds: string[] }
 */
router.delete("/cohorts/:cohortId/members", async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { jobSeekerUserIds } = req.body;

    const result = await removeMembersFromCohort({
      cohortId,
      organizationId: req.user.organizationId,
      jobSeekerUserIds,
    });

    res.json(result);
  } catch (err) {
    console.error("Error removing cohort members:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error removing cohort members" });
  }
});


export default router;
