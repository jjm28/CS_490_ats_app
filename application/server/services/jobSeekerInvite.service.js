import crypto from "crypto";
import JobSeekerInvite from "../models/Enterprise/JobSeekerInvite.js";
import User from "../models/user.js";
import Profile from "../models/profile.js";
import { addMembersToCohort } from "./cohort.service.js";
import { sendJobSeekerInviteEmail } from "./emailService.js"; // you’ll implement this similar to advisor invites

const INVITE_DAYS = 7;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function createJobSeekerInvite({
  organizationId,
  createdByUserId,
  email,
  cohortId,
  orgName,
  baseUrl,
}) {
  if (!organizationId || !createdByUserId || !email) {
    const error = new Error(
      "organizationId, createdByUserId and email are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addDays(new Date(), INVITE_DAYS);

  await JobSeekerInvite.updateMany(
    {
      email: normalizedEmail,
      organizationId,
      status: "pending",
    },
    { $set: { status: "cancelled" } }
  );

  const invite = await JobSeekerInvite.create({
    email: normalizedEmail,
    organizationId,
    cohortId: cohortId || null,
    createdByUserId,
    token,
    expiresAt,
    status: "pending",
  });

  const inviteLink = `${baseUrl}/jobseeker/accept-invite?token=${token}`;

  await sendJobSeekerInviteEmail({
    toEmail: normalizedEmail,
    orgName,
    inviteLink,
  });

  const { token: _ignored, ...safe } = invite.toObject();
  return safe;
}

export async function getInviteByToken({ token }) {
  const invite = await JobSeekerInvite.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!invite) {
    const error = new Error("Invite is invalid or expired");
    error.statusCode = 404;
    throw error;
  }

  return {
    email: invite.email,
    organizationId: invite.organizationId,
    cohortId: invite.cohortId,
  };
}

export async function getJobSeekerInviteByToken(token) {
  const invite = await JobSeekerInvite.findOne({ token }).lean();
  if (!invite) {
    const err = new Error("Invite not found");
    err.statusCode = 404;
    throw err;
  }

  if (invite.cancelledAt) {
    const err = new Error("Invite has been cancelled");
    err.statusCode = 410;
    throw err;
  }

  if (invite.acceptedAt) {
    const err = new Error("Invite has already been used");
    err.statusCode = 410;
    throw err;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    const err = new Error("Invite has expired");
    err.statusCode = 410;
    throw err;
  }

  return invite;
}

export async function acceptJobSeekerInvite({
  token,
  passwordHash,
  profileData,
}) {
  const invite = await JobSeekerInvite.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    const error = new Error("Invite is invalid or expired");
    error.statusCode = 404;
    throw error;
  }

  const { email, organizationId, cohortId } = invite;

  let user = await User.findOne({ email, organizationId });

  if (user) {
    user.isDeleted = false;
    if (!user.role || user.role === "job_seeker") {
      user.role = "job_seeker";
    }
    await user.save();
  } else {
    user = await User.create({
      email,
      organizationId,
      role: "job_seeker",
      isDeleted: false,
      passwordHash, // you’ll hash this in controller
    });
  }

  const existingProfile = await Profile.findOne({
    userId: user._id.toString(),
  });

  const fullName =
    profileData.fullName ||
    [profileData.firstName, profileData.lastName].filter(Boolean).join(" ");

  if (existingProfile) {
    await Profile.updateOne(
      { userId: user._id.toString() },
      {
        $set: {
          fullName: fullName || existingProfile.fullName,
          headline: profileData.headline || existingProfile.headline,
          phone: profileData.phone || existingProfile.phone,
          location: profileData.location || existingProfile.location,
        },
      }
    );
  } else {
    await Profile.create({
      userId: user._id.toString(),
      fullName: fullName || "",
      email,
      headline: profileData.headline || "",
      phone: profileData.phone || "",
      location: profileData.location || {},
    });
  }

  if (cohortId) {
    await addMembersToCohort({
      cohortId,
      organizationId,
      jobSeekerUserIds: [user._id.toString()],
      source: "invite",
    });
  }

  invite.status = "accepted";
  invite.acceptedAt = new Date();
  await invite.save();

  return {
    userId: user._id.toString(),
    organizationId,
  };
}
