// models/Supporter.js
import mongoose from "mongoose";

const SupporterSchema = new mongoose.Schema(
  {
    // The job seeker this supporter belongs to
    ownerUserId: { type: String, required: true, index: true }, // user._id as string
    supporterUserId: { type: String, default: null, index: true },

    fullName: { type: String, required: true },
    email: { type: String, required: true },
    relationship: {
      type: String,
      enum: ["parent", "sibling", "partner", "friend", "mentor", "other"],
      default: "other",
    },

    status: {
      type: String,
      enum: ["invited", "accepted", "revoked"],
      default: "invited",
    },

    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    lastViewedAt: { type: Date },

    // For magic-link portal access
    inviteToken: { type: String, index: true, sparse: true },

    // What this supporter is allowed to see
    permissions: {
      canSeeProgressSummary: { type: Boolean, default: true },
      canSeeCompanyNames: { type: Boolean, default: false },
      canSeeInterviewSchedule: { type: Boolean, default: true },
      canSeeRejections: { type: Boolean, default: false },
      canSeeSalaryInfo: { type: Boolean, default: false },
      canSeeNotes: { type: Boolean, default: false },
      canSeeWellbeingCheckins: { type: Boolean, default: false },
    },

    // Boundaries & guidelines
    boundaries: {
      preferredContactChannel: {
        type: String,
        enum: ["email", "sms", "in_app", "none"],
        default: "in_app",
      },
      preferredCheckinFrequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "ad_hoc"],
        default: "weekly",
      },
      topicsOffLimits: { type: [String], default: [] },
      userMessageToSupporter: { type: String }, // “How to support me” note
    },
  },
  { timestamps: true }
);

const Supporter = mongoose.model("Supporter", SupporterSchema);
export default Supporter;
