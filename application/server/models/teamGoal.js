import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
  },
  { _id: false }
);

const TeamGoalSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // mentee this goal belongs to
    title: { type: String, required: true },
    description: { type: String },
    milestones: [MilestoneSchema],
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("TeamGoal", TeamGoalSchema);
