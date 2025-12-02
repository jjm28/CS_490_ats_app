// routes/advisor.routes.js
import express from "express";
import {
  createAdvisorInvite,
  respondToAdvisorInviteByToken,
  listAdvisorsForOwner,
  listClientsForAdvisor,
  getAdvisorClientProfile,
  updateAdvisorPermissions,
  updateAdvisorMetadata,
  revokeAdvisor,
  deleteAdvisorRelationship,
} from "../services/advisor.service.js";

const router = express.Router();

/**
 * POST /api/advisors/invite
 * Candidate creates an advisor invite.
 */
router.post("/advisors/invite", async (req, res) => {
  try {
    const {
      ownerUserId,
      advisorName,
      advisorEmail,
      advisorType,
      permissions,
    } = req.body;

    if (!ownerUserId) {
      return res
        .status(400)
        .json({ error: "ownerUserId is required" });
    }

    const relationship = await createAdvisorInvite({
      ownerUserId: String(ownerUserId),
      advisorName,
      advisorEmail,
      advisorType,
      permissions,
    });

    res.status(201).json(relationship);
  } catch (err) {
    console.error("Error creating advisor invite:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message || "Server error creating advisor invite",
      });
  }
});

/**
 * GET /api/advisors?ownerUserId=...
 * List advisors for a candidate.
 */
router.get("/advisors", async (req, res) => {
  try {
    const { ownerUserId } = req.query;

    if (!ownerUserId) {
      return res
        .status(400)
        .json({ error: "ownerUserId is required" });
    }

    const advisors = await listAdvisorsForOwner(
      String(ownerUserId)
    );
    res.json(advisors);
  } catch (err) {
    console.error("Error listing advisors:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error: err.message || "Server error listing advisors",
      });
  }
});

/**
 * PATCH /api/advisors/:relationshipId
 * Update advisor metadata (name, type) for a candidate.
 */
router.patch("/advisors/:relationshipId", async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { ownerUserId, advisorName, advisorType } = req.body;

    if (!ownerUserId) {
      return res
        .status(400)
        .json({ error: "ownerUserId is required" });
    }

    const updated = await updateAdvisorMetadata({
      ownerUserId: String(ownerUserId),
      relationshipId,
      advisorName,
      advisorType,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating advisor metadata:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message ||
          "Server error updating advisor metadata",
      });
  }
});

/**
 * PATCH /api/advisors/:relationshipId/permissions
 * Update advisor permissions for a candidate.
 */
router.patch(
  "/advisors/:relationshipId/permissions",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { ownerUserId, permissions } = req.body;

      if (!ownerUserId) {
        return res
          .status(400)
          .json({ error: "ownerUserId is required" });
      }

      const updated = await updateAdvisorPermissions({
        ownerUserId: String(ownerUserId),
        relationshipId,
        permissions,
      });

      res.json(updated);
    } catch (err) {
      console.error("Error updating advisor permissions:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error updating advisor permissions",
        });
    }
  }
);

/**
 * PATCH /api/advisors/:relationshipId/revoke
 * Revoke advisor access (candidate side).
 */
router.patch(
  "/advisors/:relationshipId/revoke",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { ownerUserId } = req.body;

      if (!ownerUserId) {
        return res
          .status(400)
          .json({ error: "ownerUserId is required" });
      }

      const updated = await revokeAdvisor({
        ownerUserId: String(ownerUserId),
        relationshipId,
      });

      res.json(updated);
    } catch (err) {
      console.error("Error revoking advisor:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message || "Server error revoking advisor access",
        });
    }
  }
);

/**
 * DELETE /api/advisors/:relationshipId
 * Delete advisor relationship (only if pending).
 */
router.delete("/advisors/:relationshipId", async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { ownerUserId } = req.body;

    if (!ownerUserId) {
      return res
        .status(400)
        .json({ error: "ownerUserId is required" });
    }

    const result = await deleteAdvisorRelationship({
      ownerUserId: String(ownerUserId),
      relationshipId,
    });

    res.json(result);
  } catch (err) {
    console.error("Error deleting advisor relationship:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message ||
          "Server error deleting advisor relationship",
      });
  }
});

/**
 * POST /api/advisors/accept
 * Advisor accepts invite by token.
 */
router.post("/advisors/accept", async (req, res) => {
  try {
    const { token, advisorUserId, advisorProfileInput } = req.body;

    if (!token || !advisorUserId) {
      return res.status(400).json({
        error: "token and advisorUserId are required",
      });
    }

    const result = await respondToAdvisorInviteByToken({
      inviteToken: token,
      advisorUserId: String(advisorUserId),
      advisorProfileInput: advisorProfileInput || {},
    });

    res.json(result);
  } catch (err) {
    console.error("Error accepting advisor invite:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message || "Server error accepting advisor invite",
      });
  }
});

/**
 * GET /api/advisors/clients?advisorUserId=...
 * Advisor portal: list clients.
 */
router.get("/advisors/clients", async (req, res) => {
  try {
    const { advisorUserId } = req.query;

    if (!advisorUserId) {
      return res
        .status(400)
        .json({ error: "advisorUserId is required" });
    }

    const clients = await listClientsForAdvisor(
      String(advisorUserId)
    );
    res.json(clients);
  } catch (err) {
    console.error("Error listing advisor clients:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message ||
          "Server error listing advisor clients",
      });
  }
});

/**
 * GET /api/advisors/clients/:relationshipId/profile?advisorUserId=...
 * Advisor portal: view single client profile.
 */
router.get(
  "/advisors/clients/:relationshipId/profile",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { advisorUserId } = req.query;

      if (!advisorUserId) {
        return res.status(400).json({
          error: "advisorUserId is required",
        });
      }

      const profile = await getAdvisorClientProfile({
        relationshipId,
        advisorUserId: String(advisorUserId),
      });

      res.json(profile);
    } catch (err) {
      console.error(
        "Error fetching advisor client profile:",
        err
      );
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error fetching client profile",
        });
    }
  }
);

export default router;
