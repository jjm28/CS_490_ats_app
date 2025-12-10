// models/JobSharing/JobSharingEncouragement.js
import mongoose from "mongoose";

const JobSharingEncouragementSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },

    // who sent this encouragement – "system" for now, later can be partner user IDs
    sourceUserId: { type: String, default: "system" },

    // what type of positive event is this?
    type: {
      type: String,
      enum: ["goal_completed", "milestone_added", "streak", "custom"],
      required: true,
    },

    // optional references
    targetGoalId: { type: String },
    targetMilestoneId: { type: String },

    // human-readable message to show in UI
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const JobSharingEncouragement = mongoose.model(
  "JobSharingEncouragement",
  JobSharingEncouragementSchema
);

export default JobSharingEncouragement;
