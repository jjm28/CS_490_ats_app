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
   listAdvisorMessages,
  createAdvisorMessage,  getAdvisorSharingConfig,
  updateAdvisorSharingConfig,
  getAdvisorClientMaterials,  listAdvisorRecommendations,
  createAdvisorRecommendation,
  updateAdvisorRecommendation,  getAdvisorAvailability,
  upsertAdvisorAvailability,
  generateUpcomingSlots,
  listAdvisorSessions,
  bookAdvisorSession,
  updateAdvisorSession,
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



/**
 * GET /api/advisors/clients/:relationshipId/messages
 * List messages for a relationship (candidate or advisor).
 * Query: role=candidate|advisor, userId=<currentUserId>
 */
router.get(
  "/advisors/clients/:relationshipId/messages",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { role, userId } = req.query;

      if (!role || !userId) {
        return res.status(400).json({
          error: "role and userId are required",
        });
      }

      const messages = await listAdvisorMessages({
        relationshipId,
        role: String(role),
        userId: String(userId),
      });

      res.json(messages);
    } catch (err) {
      console.error("Error listing advisor messages:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error listing advisor messages",
        });
    }
  }
);

/**
 * POST /api/advisors/clients/:relationshipId/messages
 * Create a new message in a relationship (candidate or advisor).
 * Body: { role, userId, body }
 */
router.post(
  "/advisors/clients/:relationshipId/messages",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { role, userId, body } = req.body;

      if (!role || !userId) {
        return res.status(400).json({
          error: "role and userId are required",
        });
      }

      const message = await createAdvisorMessage({
        relationshipId,
        role: String(role),
        userId: String(userId),
        body,
      });

      res.status(201).json(message);
    } catch (err) {
      console.error("Error creating advisor message:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error creating advisor message",
        });
    }
  }
);

/**
 * GET /api/advisors/:relationshipId/sharing-config
 * Candidate: view current sharing config and available items.
 */
router.get(
  "/advisors/:relationshipId/sharing-config",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { ownerUserId } = req.query;

      if (!ownerUserId) {
        return res
          .status(400)
          .json({ error: "ownerUserId is required" });
      }

      const result = await getAdvisorSharingConfig({
        ownerUserId: String(ownerUserId),
        relationshipId,
      });

      res.json(result);
    } catch (err) {
      console.error(
        "Error fetching advisor sharing config:",
        err
      );
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error fetching advisor sharing config",
        });
    }
  }
);
/**
 * PATCH /api/advisors/:relationshipId/sharing-config
 * Candidate: update which resumes, cover letters, jobs, and progress are shared.
 */
router.patch(
  "/advisors/:relationshipId/sharing-config",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const {
        ownerUserId,
        sharedResumeIds,
        sharedCoverLetterIds,
        sharedJobIds,
        shareProgressSummary,
      } = req.body;

      if (!ownerUserId) {
        return res
          .status(400)
          .json({ error: "ownerUserId is required" });
      }

      const updated = await updateAdvisorSharingConfig({
        ownerUserId: String(ownerUserId),
        relationshipId,
        sharedResumeIds,
        sharedCoverLetterIds,
        sharedJobIds,
        shareProgressSummary,
      });

      res.json(updated);
    } catch (err) {
      console.error(
        "Error updating advisor sharing config:",
        err
      );
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error updating sharing config",
        });
    }
  }
);
/**
 * GET /api/advisors/clients/:relationshipId/materials
 * Advisor portal: view client documents, applications, and progress.
 */
router.get(
  "/advisors/clients/:relationshipId/materials",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { advisorUserId } = req.query;

      if (!advisorUserId) {
        return res
          .status(400)
          .json({ error: "advisorUserId is required" });
      }

      const result = await getAdvisorClientMaterials({
        relationshipId,
        advisorUserId: String(advisorUserId),
      });

      res.json(result);
    } catch (err) {
      console.error(
        "Error fetching advisor client materials:",
        err
      );
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error fetching client materials",
        });
    }
  }
);


/**
 * GET /api/advisors/clients/:relationshipId/recommendations
 * role=candidate|advisor, userId=<id>
 */
router.get(
  "/advisors/clients/:relationshipId/recommendations",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { role, userId } = req.query;

      if (!role || !userId) {
        return res
          .status(400)
          .json({ error: "role and userId are required" });
      }

      const recs = await listAdvisorRecommendations({
        relationshipId,
        role: String(role),
        userId: String(userId),
      });

      res.json(recs);
    } catch (err) {
      console.error("Error listing recommendations:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error listing recommendations",
        });
    }
  }
);
/**
 * POST /api/advisors/clients/:relationshipId/recommendations
 * Advisor creates a recommendation.
 * Body: { advisorUserId, title, description?, category?, jobId?, resumeId?, coverLetterId? }
 */
router.post(
  "/advisors/clients/:relationshipId/recommendations",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const {
        advisorUserId,
        title,
        description,
        category,
        jobId,
        resumeId,
        coverLetterId,
      } = req.body;

      if (!advisorUserId) {
        return res
          .status(400)
          .json({ error: "advisorUserId is required" });
      }

      const rec = await createAdvisorRecommendation({
        relationshipId,
        advisorUserId: String(advisorUserId),
        title,
        description,
        category,
        jobId,
        resumeId,
        coverLetterId,
      });

      res.status(201).json(rec);
    } catch (err) {
      console.error("Error creating recommendation:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error creating recommendation",
        });
    }
  }
);
/**
 * PATCH /api/advisors/recommendations/:recommendationId
 * Body: { role, userId, ...fields }
 */
router.patch(
  "/advisors/recommendations/:recommendationId",
  async (req, res) => {
    try {
      const { recommendationId } = req.params;
      const { role, userId, ...fields } = req.body;

      if (!role || !userId) {
        return res
          .status(400)
          .json({ error: "role and userId are required" });
      }

      const updated = await updateAdvisorRecommendation({
        recommendationId,
        role: String(role),
        userId: String(userId),
        fields,
      });

      res.json(updated);
    } catch (err) {
      console.error("Error updating recommendation:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error updating recommendation",
        });
    }
  }
);

/**
 * GET /api/advisors/me/availability?advisorUserId=...
 */
router.get("/advisors/me/availability", async (req, res) => {
  try {
    const { advisorUserId } = req.query;
    if (!advisorUserId) {
      return res
        .status(400)
        .json({ error: "advisorUserId is required" });
    }

    const availability = await getAdvisorAvailability(
      String(advisorUserId)
    );
    res.json(availability);
  } catch (err) {
    console.error("Error fetching availability:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message || "Server error fetching availability",
      });
  }
});

/**
 * PUT /api/advisors/me/availability
 * Body: { advisorUserId, weeklySlots, sessionTypes, timezone? }
 */
router.put("/advisors/me/availability", async (req, res) => {
  try {
    const { advisorUserId, weeklySlots, sessionTypes, timezone } =
      req.body;

    if (!advisorUserId) {
      return res
        .status(400)
        .json({ error: "advisorUserId is required" });
    }

    const updated = await upsertAdvisorAvailability({
      advisorUserId: String(advisorUserId),
      weeklySlots,
      sessionTypes,
      timezone,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating availability:", err);
    res
      .status(err.statusCode || 500)
      .json({
        error:
          err.message ||
          "Server error updating availability",
      });
  }
});
/**
 * GET /api/advisors/clients/:relationshipId/slots
 * Query: advisorUserId, daysAhead?
 */
router.get(
  "/advisors/clients/:relationshipId/slots",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { advisorUserId, daysAhead = 14 } = req.query;

      if (!advisorUserId) {
        return res
          .status(400)
          .json({ error: "advisorUserId is required" });
      }

      // Optional: you could validate relationship here if you want,
      // but main purpose is to show advisor's availability.
      const slots = await generateUpcomingSlots({
        advisorUserId: String(advisorUserId),
        daysAhead: Number(daysAhead) || 14,
      });

      res.json(
        slots.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );
    } catch (err) {
      console.error("Error fetching advisor slots:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error fetching advisor slots",
        });
    }
  }
);
/**
 * GET /api/advisors/clients/:relationshipId/sessions?role=&userId=
 */
router.get(
  "/advisors/clients/:relationshipId/sessions",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { role, userId } = req.query;

      if (!role || !userId) {
        return res
          .status(400)
          .json({
            error: "role and userId are required",
          });
      }

      const sessions = await listAdvisorSessions({
        relationshipId,
        role: String(role),
        userId: String(userId),
      });

      res.json(sessions);
    } catch (err) {
      console.error("Error listing advisor sessions:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error listing sessions",
        });
    }
  }
);

/**
 * POST /api/advisors/clients/:relationshipId/sessions
 * Body: { role, createdByUserId, ownerUserId, advisorUserId, startTime, endTime, sessionType, note? }
 */
router.post(
  "/advisors/clients/:relationshipId/sessions",
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const {
        role,
        createdByUserId,
        ownerUserId,
        advisorUserId,
        startTime,
        endTime,
        sessionType,
        note,
      } = req.body;

      if (
        !role ||
        !createdByUserId ||
        !ownerUserId ||
        !advisorUserId ||
        !startTime ||
        !endTime ||
        !sessionType
      ) {
        return res
          .status(400)
          .json({ error: "Missing required fields" });
      }

      const session = await bookAdvisorSession({
        relationshipId,
        role: String(role),
        createdByUserId: String(createdByUserId),
        ownerUserId: String(ownerUserId),
        advisorUserId: String(advisorUserId),
        startTime,
        endTime,
        sessionType,
        note,
      });

      res.status(201).json(session);
    } catch (err) {
      console.error("Error booking advisor session:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error booking session",
        });
    }
  }
);

/**
 * PATCH /api/advisors/sessions/:sessionId
 * Body: { role, userId, status }
 */
router.patch(
  "/advisors/sessions/:sessionId",
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { role, userId, status } = req.body;

      if (!role || !userId || !status) {
        return res
          .status(400)
          .json({
            error: "role, userId and status are required",
          });
      }

      const updated = await updateAdvisorSession({
        sessionId,
        role: String(role),
        userId: String(userId),
        status: String(status),
      });

      res.json(updated);
    } catch (err) {
      console.error("Error updating advisor session:", err);
      res
        .status(err.statusCode || 500)
        .json({
          error:
            err.message ||
            "Server error updating session",
        });
    }
  }
);

export default router;
