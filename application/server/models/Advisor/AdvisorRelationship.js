// models/Advisor/AdvisorRelationship.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AdvisorPermissionsSchema = new Schema(
  {
    canViewBasicProfile: { type: Boolean, default: true },
    canViewJobSummary: { type: Boolean, default: true },
    canViewDocumentsSummary: { type: Boolean, default: false },
  },
  { _id: false }
);

const AdvisorRelationshipSchema = new Schema(
  {
    // Candidate / owner
    ownerUserId: { type: String, required: true, index: true },

    // Advisor (filled after invite accepted)
    advisorUserId: { type: String, default: null, index: true },

    advisorName: { type: String, default: "" },
    advisorEmail: { type: String, required: true, index: true },

    advisorType: {
      type: String,
      enum: ["Mentor", "Coach"],
      default: "Mentor",
    },

    // "pending" until invite accepted
    status: {
      type: String,
      enum: ["pending", "active", "revoked"],
      default: "pending",
      index: true,
    },

    permissions: { type: AdvisorPermissionsSchema, default: () => ({}) },

    // Invite token handling
    inviteToken: { type: String, required: true, unique: true, index: true },
    inviteExpiresAt: { type: Date, required: true },

    // Optional notes / metadata
    relationshipNote: { type: String, default: "" },
  },
  { timestamps: true }
);

AdvisorRelationshipSchema.index({ ownerUserId: 1, status: 1 });
AdvisorRelationshipSchema.index({ advisorUserId: 1, status: 1 });

const AdvisorRelationship =
  mongoose.models.AdvisorRelationship ||
  mongoose.model("AdvisorRelationship", AdvisorRelationshipSchema);

export default AdvisorRelationship;
