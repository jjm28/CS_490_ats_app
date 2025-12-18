import express from "express";
import {
  getApplicationMaterialPerformance,
  getJobsByMaterialVersion
} from "../services/applicationMaterials.service.js";
import Jobs from "../models/jobs.js";
import { aggregateByBaseMaterial } from "../services/applicationMaterials.service.js";

const router = express.Router();

// GET /api/analytics/application-materials
router.get("/", async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.headers["x-dev-user-id"];

    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const data = await getApplicationMaterialPerformance(userId);
    res.json(data);
  } catch (err) {
    console.error("Material analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/application-materials/compare/:type/:baseId
router.get("/compare/:type/:baseId", async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.headers["x-dev-user-id"];

    const { type, baseId } = req.params;

    if (!["resume", "cover-letter"].includes(type)) {
      return res.status(400).json({ error: "Invalid material type" });
    }

    const jobs = await Jobs.find({
      userId,
      [`applicationPackage.${type === "resume" ? "resumeId" : "coverLetterId"}`]: baseId
    }).lean();

    const grouped = aggregateByBaseMaterial(
      jobs,
      type === "resume" ? "resumeId" : "coverLetterId",
      type === "resume" ? "resumeVersionId" : "coverLetterVersionId",
      type === "resume" ? "resumeVersionLabel" : "coverLetterVersionLabel"
    );

    res.json(grouped[0]?.versions ?? []);
  } catch (err) {
    console.error("Material comparison error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/application-materials/:type/:versionId
router.get("/:type/:versionId", async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.headers["x-dev-user-id"];

    const { type, versionId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    if (!["resume", "cover-letter"].includes(type)) {
      return res.status(400).json({ error: "Invalid material type" });
    }

    const jobs = await getJobsByMaterialVersion(userId, type, versionId);
    res.json(jobs);
  } catch (err) {
    console.error("Material usage detail error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;