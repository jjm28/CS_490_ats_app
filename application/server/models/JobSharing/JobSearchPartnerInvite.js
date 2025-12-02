import mongoose from "mongoose";

const JobSearchPartnerInviteSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      index: true,
    },
    invitedEmail: {
      type: String,
      required: true,
      index: true,
    },
    invitedUserId: {
      type: String,
      default: null,
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const JobSearchPartnerInvite = mongoose.model(
  "JobSearchPartnerInvite",
  JobSearchPartnerInviteSchema
);

export default JobSearchPartnerInvite;
