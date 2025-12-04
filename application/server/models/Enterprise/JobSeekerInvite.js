import mongoose from "mongoose";

const { Schema } = mongoose;

const JobSeekerInviteSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    cohortId: {
      type: String,
      default: null,
    },
    createdByUserId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

JobSeekerInviteSchema.index(
  { email: 1, organizationId: 1, status: 1 },
  { name: "invite_email_org_status" }
);

const JobSeekerInvite =
  mongoose.models.JobSeekerInvite ||
  mongoose.model("JobSeekerInvite", JobSeekerInviteSchema);

export default JobSeekerInvite;
