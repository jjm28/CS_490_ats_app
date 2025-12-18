import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { evaluateApplicationPackage } from "../services/application_quality.service.js";

const router = express.Router();

router.use(verifyJWT);

/**
 * GET /api/application-quality/:jobId
 */
router.get("/:jobId", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { jobId } = req.params;

    const result = await evaluateApplicationPackage({
      userId,
      jobId
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Application quality error:", err);
    res.status(400).json({
      error: err.message || "Failed to evaluate application package"
    });
  }
});

export default router;