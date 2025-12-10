// models/JobSearchGoalProgress.js
import mongoose from "mongoose";

const JobSearchGoalProgressSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    goalId: { type: String, required: true, index: true },

    delta: { type: Number, required: true }, // e.g. +2
    newValue: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

const JobSearchGoalProgress = mongoose.model(
  "JobSearchGoalProgress",
  JobSearchGoalProgressSchema
);

export default JobSearchGoalProgress;
