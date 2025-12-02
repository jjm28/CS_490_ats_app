// models/JobSearchMilestone.js
import mongoose from "mongoose";

const JobSearchMilestoneSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    achievedAt: { type: Date, default: Date.now },

    // optional: relate to a job in your Jobs collection
    relatedJobId: { type: String },
    type: { type: String }, // e.g. "interview", "offer", "networking"
  },
  { timestamps: true }
);

const JobSearchMilestone = mongoose.model(
  "JobSearchMilestone",
  JobSearchMilestoneSchema
);

export default JobSearchMilestone;
