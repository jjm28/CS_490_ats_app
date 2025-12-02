// models/JobSharing/JobSharingEngagement.js
import mongoose from "mongoose";

const JobSharingEngagementSchema = new mongoose.Schema(
  {
    // whose job search this is
    ownerUserId: { type: String, required: true, index: true },

    // the accountability partner
    partnerUserId: { type: String, required: true, index: true },

    // what they did
    type: {
      type: String,
      enum: ["view_progress", "view_report", "view_milestones", "encouragement_reaction"],
      required: true,
    },

    // optional context – e.g. reportId, goalId, milestoneId
    contextId: { type: String },
  },
  { timestamps: true }
);

const JobSharingEngagement = mongoose.model(
  "JobSharingEngagement",
  JobSharingEngagementSchema
);

export default JobSharingEngagement;
