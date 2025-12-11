import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { GenerateResumeBasedOn } from "../services/resume_ai.service.js";
import {
  createResume, updateResume, getResume, deleteResume,
  createSharedResume, fetchSharedResume, addSharedResumeComment,
  updateSharedResumeComment,
  updateresumeSharedsettings,
  inviteReviewer,
  addreviewerResumeSharedsettings,
  removereviewerResumeSharedsettings,
  getResumeFeedbackSummary
} from "../services/resume.service.js";
import Resume from "../models/resume.js";

const router = express.Router();

// Bridge cookie → Authorization header
router.use((req, _res, next) => {
  if (!req.headers.authorization && req.cookies?.token) {
    req.headers.authorization = `Bearer ${req.cookies.token}`;
  }
  next();
});

// Require JWT (header now present)
router.use(verifyJWT);

const userIdFrom = (req) =>
  req.query?.userid || req.body?.userid || req.user?._id || req.user?.id;

// GET list
router.get("/", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { resumeid } = req.query;
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await getResume({ userid, resumeid });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await getResume({ userid, resumeid: req.params.id });
    if (!out) return res.status(404).json({ error: "NotFound" });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { filename, templateKey, resumedata, lastSaved } = req.body || {};
    if (!userid || !filename || !templateKey || !resumedata)
      return res.status(400).json({ error: "Missing fields" });

    const out = await createResume(
      { userid, filename, templateKey, lastSaved },
      resumedata
    );
    res.status(201).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/generate-resumeai", async (req, res) => {
  try {
    const { userid, Jobdata } = req.body || {};
    if (!userid || !Jobdata) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // scrub DB-only fields if Jobdata came from your collection
    const safeJob = { ...Jobdata };
    delete safeJob._id; delete safeJob.userId;
    delete safeJob.createdAt; delete safeJob.updatedAt; delete safeJob.__v;

    const ai = await GenerateResumeBasedOn(userid, safeJob, {
      temperature: 0.6,
      candidateCount: 3, //from 3 to 1
      maxBulletsPerRole: 5
    });

    if (ai.error) {
      const code = ai.error === "rate_limit" ? 429 : ai.error === "auth" ? 401 : 500;
      return res.status(code).json(ai);
    }
    return res.status(201).json(ai);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { filename, resumedata, lastSaved, templateKey, tags } = req.body || {};
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const out = await updateResume(
      { resumeid: req.params.id, userid, filename, lastSaved, templateKey, tags },
      resumedata
    );
    if (out?.message) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    if (!userid) return res.status(401).json({ error: "Missing user session" });

    const ok = await deleteResume({ resumeid: req.params.id, userid });
    if (!ok) return res.status(404).json({ error: "NotFound" });
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// SHARE create/update
router.post("/:id/share", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    
    const { resumedata,visibility,  allowComments ,  reviewDeadline} = req.body || {};
    if (!userid || !resumedata) return res.status(400).json({ error: "Missing fields" });
    const out = await createSharedResume({ userid, resumeid: req.params.id, resumedata,visibility,  allowComments });
    
    await updateresumeSharedsettings({resumeid: req.params.id, userid: userid ,allowComments,visibility,allowComments,reviewDeadline})
    res.status(201).json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
/**
 * POST /api/supporters/invite?userId=...
 * Body: { fullName, email, relationship?, presetKey? }
 */
router.post("/invite", async (req, res) => {
  try {
    const { userId } = req.query;
    const { toemail, sharedurl,resumeId, role ,canComment,canResolve,reviewDeadline} = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!toemail || !sharedurl || !resumeId) {
      return res
        .status(400)
        .json({ error: "toemail and toemail are required" });
    }

    const sent = await inviteReviewer({
    ownerUserId: userId, email: toemail, url: sharedurl, role: role, reviewDeadline: reviewDeadline  });
    await addreviewerResumeSharedsettings({resumeId,userId,toemail,role ,canComment,canResolve})
    res.status(201).json(sent);
  } catch (err) {
    console.error("Error inviting supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error inviting supporter" });
  }
});

// SHARE fetch
router.get("/shared/:userid/:sharedid/:currentUseremail", async (req, res) => {

  try {
  const { userid, sharedid ,currentUseremail} = req.params;

  const out = await fetchSharedResume({  sharedid,currentUseremail,viewerid: userid });
    if (!out) return res.status(404).json({ error: "Share link invalid or expired" });
    res.status(200).json(out);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});



router.post(
  "/shared/:sharedid/comments",
  verifyJWT,
  async (req, res) => {
    try {
      const viewerId = userIdFrom(req);
      const { message,currentUseremail } = req.body || {};
      if (!viewerId || !message || !message.trim()) {
        return res.status(400).json({ error: "Missing viewer or message" });
      }

      const updated = await addSharedResumeComment({
        sharedid: req.params.sharedid,
        viewerid: viewerId,
        message: message.trim(), currentUseremail: currentUseremail
      });

      if (!updated) {
        return res
          .status(404)
          .json({ error: "Share link invalid or expired" });
      }

      // You can return either {comments:[...]} or {comment: {...}}.
      res.status(201).json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.patch(
  "/shared/:sharedid/comments/:commentId",
  verifyJWT,
  async (req, res) => {
    try {
      const viewerId = userIdFrom(req);
      const { resolved } = req.body || {};
      if (typeof resolved !== "boolean") {
        return res.status(400).json({ error: "Missing resolved flag" });
      }

      const updated = await updateSharedResumeComment({
        sharedid: req.params.sharedid,
        commentId: req.params.commentId,
        viewerid: viewerId, // service should enforce "only owner can resolve"
        resolved,
      });

      if (updated?.error === "forbidden") {
        return res.status(403).json({ error: "Not allowed" });
      }
      if (!updated) {
        return res
          .status(404)
          .json({ error: "Share link or comment not found" });
      }

      res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  }
);


router.patch("/:resumeid/workflow", async (req, res) => {
  try {
    const { status } = req.body; // status: WorkflowStatus
    const { resumeid } = req.params;

    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    // only owner can update workflow for now
    const resume = await Resume.findOne({
      _id: resumeid,
      owner: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ error: "Not found" });
    }
resume.lastSaved = new Date();
    resume.workflowStatus = status;

    if (status === "approved") {
      resume.approvedBy = req.user._id.toString();
      resume.approvedByName = req.user.name || null;
      resume.approvedAt = new Date();
    } else {
      // if reverting away from approved, clear approver info
      resume.approvedBy = null;
      resume.approvedByName = null;
      resume.approvedAt = null;
    }

    await resume.save();

    return res.json({
      workflowStatus: resume.workflowStatus,
      approvedByName: resume.approvedByName,
      approvedAt: resume.approvedAt,
    });
  } catch (err) {
    console.error("Error updating workflow status", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/supporters/invite?userId=...
 * Body: { fullName, email, relationship?, presetKey? }
 */ 
router.post("/removeinvite", async (req, res) => {
  try {
    const { userId } = req.query;
    const { email, resumeid } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if ( !resumeid) {
      return res
        .status(400)
        .json({ error: "resumeid are required" });
    }

    
    await removereviewerResumeSharedsettings({resumeid,userId,email})
    res.status(201).json(true);
  } catch (err) {
    console.error("Error inviting supporter:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error inviting supporter" });
  }
});



// GET /api/coverletter/:coverletterid/feedback-summary
router.get("/:resumeid/feedback-summary", async (req, res) => {
  try {
    const { resumeid } = req.params;
    const { userid } = req.query; // keeping consistent with your other coverletter routes

    if (!userid || !resumeid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const summary = await getResumeFeedbackSummary({
      userid,
      resumeid,
    });

    return res.status(200).json(summary);
  } catch (err) {
    console.error("Error generating feedback summary:", err);
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Server error generating summary" });
  }
});

export default router;
