import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getBrandingForOrg,
  updateBrandingForOrg,
} from "../services/organization.service.js";

const router = express.Router();

/**
 * GET branding for the current user's organization
 */
router.get("/org/branding/me",  async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const branding = await getBrandingForOrg(orgId);
    res.json(branding);
  } catch (err) {
    console.error("Branding fetch error", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * PATCH update branding
 * Allowed roles: super_admin, org_admin
 */
router.patch(
  "/org/branding/me",
  requireAuth,
  requireRole(["org_admin", "super_admin"]),
  async (req, res) => {
    try {
      const orgId = req.user.organizationId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization found for user" });
      }

      const updated = await updateBrandingForOrg(orgId, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Branding update error", err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

export default router;
