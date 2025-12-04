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

const router = express.Router();

// ALL enterprise routes require org_admin / super_admin
router.use(requireRole(["org_admin", "super_admin", "job_seeker"]));

// PUBLIC invite endpoints

router.get("/public/jobseeker-invites/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const info = await getInviteByToken({ token });
    res.json(info);
  } catch (err) {
    console.error("Error fetching invite:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Invite is invalid or expired" });
  }
});

router.post("/public/jobseeker-invites/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { password, profile } = req.body;

    const passwordHash = password; // TODO: hash properly with bcrypt

    const result = await acceptJobSeekerInvite({
      token,
      passwordHash,
      profileData: profile || {},
    });

    res.json(result);
  } catch (err) {
    console.error("Error accepting invite:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Error accepting invite" });
  }
});




export default router;
