// server/routes/teams.js
import express from "express";
import {
  createTeam,
  listTeamsForUser,
  getTeamWithMembers,
  inviteTeamMember,
  acceptTeamInvite,
  declineTeamInvite,
  updateMemberRoles,
  removeMember,
  getTeamResumeForExport,
  getTeamCoverletterForExport,
} from "../services/teams.service.js";
import { verifyJWT } from "../middleware/auth.js";
import { getCandidateSharedDocs } from "../services/teams.service.js";
import {
  toggleProfileSharing,
  toggleResumeSharing,
  toggleCoverletterSharing,
  getMySharedDocs,
} from "../services/teams.service.js";
import {
  exportTeamResumeService,
  exportTeamCoverletterService,
} from "../services/teams.service.js";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb"; 
import mongoose from "mongoose";
import Resume from "../models/resume.js";
import Coverletter from "../models/coverletters.js";
import SharedDoc from "../models/sharedDoc.js";
import {
  addSharedDocComment as addSharedDocCommentService,
} from "../services/sharedDocs.service.js";
import {
  sendTeamMessage,
  getTeamMessages,
} from "../services/teamMessages.service.js";

const router = express.Router();

// All /api/teams routes require auth
router.use(verifyJWT);

function getAuthContext(req) {
  const u = req.user || {};
  const userId =
    u.userId || u.id || u._id || u.sub || u.username || u.name;
  const email = u.email || u.username || u.login || null;
  return { userId, email };
}

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

// GET /api/teams  -> list teams + invites for current user
router.get("/", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const teams = await listTeamsForUser({ userId });
    res.json({ teams });
  } catch (err) {
    console.error("Error listing teams:", err);
    res.status(500).json({ error: "Failed to load teams" });
  }
});

// POST /api/teams  -> create team
router.post("/", async (req, res) => {
  try {
    const { userId, email } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, description, billingPlan } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const team = await createTeam({
      ownerId: userId,
      name,
      description,
      billingPlan,
      ownerEmail: email || null,
    });

    res.status(201).json(team);
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// GET /api/teams/:teamId  -> team + members
router.get("/:teamId", async (req, res) => {
  try {
    const { userId, email } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const data = await getTeamWithMembers({
      userId,
      teamId,
      currentUserEmail: email || null,
    });

    res.json(data);
  } catch (err) {
    console.error("Error loading team:", err);
    if (err.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to load team" });
  }
});

// POST /api/teams/:teamId/invite  -> invite member
router.post("/:teamId/invite", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const { email, role } = req.body || {};

    const result = await inviteTeamMember({
      adminId: userId,
      teamId,
      email,
      role,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Error inviting team member:", err);
    if (err.code === "BAD_ROLE" || err.code === "USER_NOT_FOUND") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to invite member" });
  }
});

// POST /api/teams/:teamId/accept  -> accept invite
router.post("/:teamId/accept", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const membership = await acceptTeamInvite({ userId, teamId });

    res.json({ membership });
  } catch (err) {
    console.error("Error accepting invite:", err);
    if (err.code === "INVITE_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

// POST /api/teams/:teamId/decline  -> decline/ignore invite
router.post("/:teamId/decline", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const membership = await declineTeamInvite({ userId, teamId });

    res.json({ membership });
  } catch (err) {
    console.error("Error declining invite:", err);
    if (err.code === "INVITE_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to decline invite" });
  }
});

// PATCH /api/teams/:teamId/members/:memberUserId  -> update roles
router.patch("/:teamId/members/:memberUserId", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const memberUserId = req.params.memberUserId;
    const { roles } = req.body || {};

    const membership = await updateMemberRoles({
      adminId: userId,
      teamId,
      memberUserId,
      roles: roles || [],
    });

    res.json({ membership });
  } catch (err) {
    console.error("Error updating member roles:", err);
    if (err.code === "BAD_ROLES" || err.code === "LAST_ADMIN") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to update roles" });
  }
});

// DELETE /api/teams/:teamId/members/:memberUserId  -> remove member
router.delete("/:teamId/members/:memberUserId", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const teamId = req.params.teamId;
    const memberUserId = req.params.memberUserId;

    const membership = await removeMember({
      adminId: userId,
      teamId,
      memberUserId,
    });

    res.json({ membership });
  } catch (err) {
    console.error("Error removing member:", err);
    if (err.code === "LAST_ADMIN") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to remove member" });
  }
});

/**
 * IMPORTANT: Put the /me/shared-docs route BEFORE /:teamId/shared-docs
 * so that /me/shared-docs doesn't get captured by the dynamic route.
 */

// GET /api/teams/me/shared-docs -> docs the current user has marked as shared
router.get("/me/shared-docs", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sharedDocs = await getMySharedDocs(userId);
    res.status(200).json({ sharedDocs });
  } catch (err) {
    console.error("Error in GET /me/shared-docs:", err);
    res.status(500).json({ error: "Failed to load shared docs." });
  }
});

// GET /api/teams/:teamId/shared-docs -> all candidate shared docs for a team
router.get("/:teamId/shared-docs", async (req, res) => {
  
  try {
    const { userId } = getAuthContext(req);
    const { teamId } = req.params;

    if (!userId) {
      console.warn("[shared-docs] Missing userId in auth context");
      return res.status(401).json({ error: "Not authenticated" });
    }

    const db = getDb();

    // Convert teamId string → ObjectId so it matches what's stored in Mongo
    let teamObjectId = null;
    try {
      teamObjectId = new ObjectId(teamId);
    } catch (e) {
      console.warn("[shared-docs] teamId is not a valid ObjectId:", teamId);
    }

   

    // 🔍 Debug: show any membership docs for this teamId
    const debugAllMemberships = await db
      .collection("teamMemberships")
      .find({
        teamId: {
          $in: [
            teamId, // string form
            ...(teamObjectId ? [teamObjectId] : []), // ObjectId form
          ],
        },
      })
      .toArray();
    
    console.table(
      debugAllMemberships.map((m) => ({
        userId: m.userId,
        roles: m.roles,
        status: m.status,
        teamId: String(m.teamId),
      }))
    );

    // Actual filter: only active candidates
    const memberships = await db
      .collection("teamMemberships")
      .find({
        teamId: teamObjectId ?? teamId,
        status: "active",
        roles: { $in: ["candidate"] },
      })
      .toArray();

    
    console.table(
      memberships.map((m) => ({
        userId: m.userId,
        roles: m.roles,
        status: m.status,
        teamId: String(m.teamId),
      }))
    );

    const candidates = [];

    for (const m of memberships) {
      const candidateUserId = m.userId?.toString();
      

      const sharedDocs = await getMySharedDocs(candidateUserId);

      if (!sharedDocs) {
        console.log(
          "[getSharedDocs] No shared docs object found for",
          candidateUserId
        );
        continue;
      }

      const filteredDocs = {
        profiles: (sharedDocs.profiles || []).filter((p) => p.isShared),
        resumes: (sharedDocs.resumes || []).filter((r) => r.isShared),
        coverletters: (sharedDocs.coverletters || []).filter(
          (cl) => cl.isShared
        ),
      };

      

      if (
        filteredDocs.profiles.length === 0 &&
        filteredDocs.resumes.length === 0 &&
        filteredDocs.coverletters.length === 0
      ) {
        
        continue;
      }

      candidates.push({
        candidate: { id: candidateUserId },
        sharedDocs: filteredDocs,
      });
    }

    
    res.status(200).json({ candidates });
  } catch (err) {
    
    res.status(500).json({ error: "Failed to load team shared docs." });
  }
});

// Toggle profile sharing
router.post("/me/share/profile", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { share } = req.body;
    await toggleProfileSharing(userId, share);
    res.status(200).json({ success: true, share });
  } catch (err) {
    console.error("Error in POST /me/share/profile:", err);
    res.status(500).json({ error: "Failed to toggle profile sharing." });
  }
});

// Toggle resume sharing
router.post("/me/share/resume", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { resumeId, share } = req.body;
    await toggleResumeSharing(userId, resumeId, share);
    res.status(200).json({ success: true, share });
  } catch (err) {
    console.error("Error in POST /me/share/resume:", err);
    res.status(500).json({ error: "Failed to toggle resume sharing." });
  }
});

// Toggle cover letter sharing
router.post("/me/share/coverletter", async (req, res) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { coverletterId, share } = req.body;
    await toggleCoverletterSharing(userId, coverletterId, share);
    res.status(200).json({ success: true, share });
  } catch (err) {
    console.error("Error in POST /me/share/coverletter:", err);
    res.status(500).json({ error: "Failed to toggle cover letter sharing." });
  }
});

router.get(
  "/:teamId/shared-docs/resume/:resumeId/export",
  verifyJWT,
  async (req, res) => {
    try {
      const user = req.user || {};
      const viewerId = user.id || user.userId || user._id;

      if (!viewerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { teamId, resumeId } = req.params;

      const resume = await getTeamResumeForExport({
        viewerId,
        teamId,
        resumeId,
      });

      res.status(200).json({ resume });
    } catch (err) {
      console.error(
        "Error in GET /:teamId/shared-docs/resume/:resumeId/export:",
        err
      );
      if (err.code === "FORBIDDEN") {
        return res.status(403).json({ error: err.message });
      }
      if (err.code === "NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      res
        .status(500)
        .json({ error: "Failed to load resume for export." });
    }
  }
);

// GET /api/teams/:teamId/shared-docs/coverletter/:coverletterId/export
router.get(
  "/:teamId/shared-docs/coverletter/:coverletterId/export",
  verifyJWT,
  async (req, res) => {
    try {
      const user = req.user || {};
      const viewerId = user.id || user.userId || user._id;

      if (!viewerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { teamId, coverletterId } = req.params;

      const coverletter = await getTeamCoverletterForExport({
        viewerId,
        teamId,
        coverletterId,
      });

      res.status(200).json({ coverletter });
    } catch (err) {
      console.error(
        "Error in GET /:teamId/shared-docs/coverletter/:coverletterId/export:",
        err
      );
      if (err.code === "FORBIDDEN") {
        return res.status(403).json({ error: err.message });
      }
      if (err.code === "NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      res
        .status(500)
        .json({ error: "Failed to load cover letter for export." });
    }
  }
);

router.get("/:teamId/export/resume/:resumeId", async (req, res) => {
  try {
    const { teamId, resumeId } = req.params;
    const result = await exportTeamResumeService(teamId, resumeId);
    res.json(result);
  } catch (err) {
    console.error("Error exporting resume:", err);
    res.status(500).json({ error: err.message || "Failed to export resume" });
  }
});

// ✅ Export cover letter as JSON (for PDF rendering)
router.get("/:teamId/export/coverletter/:coverletterId", async (req, res) => {
  try {
    const { teamId, coverletterId } = req.params;
    const result = await exportTeamCoverletterService(teamId, coverletterId);
    res.json(result);
  } catch (err) {
    console.error("Error exporting cover letter:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to export cover letter" });
  }
});

router.post("/shared-docs/:sharedId/comments", async (req, res) => {
  try {
    const { sharedId } = req.params;
    const { type, text } = req.body; // type = "resume" | "coverletter"
    const { userId } = getAuthContext(req);

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!type || !["resume", "coverletter"].includes(type)) {
      return res.status(400).json({ error: "Invalid document type" });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    // ✅ Write comment into Resume / Coverletter.comments
    const comment = await addSharedDocCommentService(
      sharedId,
      type,
      text.trim(),
      userId
    );

    // 🔁 Return full comments array so UI can refresh
    const model = type === "resume" ? Resume : Coverletter;
    const doc = await model.findById(sharedId).select("comments");
    const comments = doc?.comments || [];

    res.json({
      message: "Comment added",
      comment,
      comments,
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// ✅ Get all comments for a shared doc
router.get("/shared-docs/:sharedId/comments", async (req, res) => {
  try {
    const { sharedId } = req.params;
    const { type } = req.query;

    if (!type || !["resume", "coverletter"].includes(type)) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    const model = type === "resume" ? Resume : Coverletter;
    const doc = await model.findById(sharedId).select("comments");

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ comments: doc.comments || [] });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});


router.patch("/shared-docs/:sharedId/comments/:commentId/resolve", async (req, res) => {
  try {
    const { sharedId, commentId } = req.params;
    const { type, resolved } = req.body;

    const model =
      type === "resume" ? Resume :
      type === "coverletter" ? Coverletter :
      null;

    if (!model) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    const doc = await model.findById(sharedId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const comment = (doc.comments || []).find(
      (c) => c._id.toString() === commentId
    );
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    comment.resolved = resolved ?? true;
    await doc.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Error resolving comment:", err);
    res.status(500).json({ error: "Failed to resolve comment" });
  }
});

router.get("/:teamId/messages", async (req, res) => {
  try {
    const { teamId } = req.params;

    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payload = await getTeamMessages({
      teamId,
      requesterId: userId,
    });

    // payload = { messages, members, currentUserId }
    res.json(payload);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch team messages" });
  }
});

// ✅ Send a message
router.post("/:teamId/messages", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { text, scope, recipientIds } = req.body || {};

    // ⬇️ Same auth context used everywhere else
    const { userId } = getAuthContext(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const message = await sendTeamMessage({
      teamId,
      senderId: userId,
      text,
      scope,
      recipientIds,
    });

    res.json({ message });
  } catch (err) {
    console.error("Error sending message:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to send team message" });
  }
});

export default router;
