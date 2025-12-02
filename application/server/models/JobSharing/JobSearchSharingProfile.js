// models/JobSearchSharingProfile.js
import mongoose from "mongoose";

const SharingScopesSchema = new mongoose.Schema(
  {
    shareGoals: { type: Boolean, default: true },
    shareMilestones: { type: Boolean, default: true },
    shareStats: { type: Boolean, default: true },
    shareNotes: { type: Boolean, default: true },
  },
  { _id: false }
);
const JobSearchSharingProfileSchema = new mongoose.Schema(
  {
    // owner of this sharing profile (string, but actually an ObjectId behind the scenes)
    ownerUserId: { type: String, required: true, index: true },

    // high-level visibility mode
    visibilityMode: {
      type: String,
      enum: ["private", "partners-only", "team", "public-link"],
      default: "private",
    },

    // explicit allowlist
        allowedUserIds: {
      type: [String], // user IDs of accountability partners
      default: [],
    },

    // explicit blocklist
    blockedUserIds: [{ type: String }],

    // what data can be shared with others
    scopes: {
      type: SharingScopesSchema,
      default: () => ({}),
    },

    defaultReportFrequency: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "weekly",
    },

    // optional token for public sharing later
    publicShareToken: { type: String, index: true },
  },
  { timestamps: true }
);

// one profile per user
JobSearchSharingProfileSchema.index({ ownerUserId: 1 }, { unique: true });

const JobSearchSharingProfile = mongoose.model(
  "JobSearchSharingProfile",
  JobSearchSharingProfileSchema
);

export default JobSearchSharingProfile;
