// models/JobSearchGoal.js
import mongoose from "mongoose";

const JobSearchGoalSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },

    // e.g. "applications", "networking reachouts", "mock interviews"
    unit: { type: String, default: "" },

    deadline: { type: Date },

    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

const JobSearchGoal = mongoose.model("JobSearchGoal", JobSearchGoalSchema);

export default JobSearchGoal;
