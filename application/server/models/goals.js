import mongoose from "mongoose";

const GoalsSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  weeklyApplicationsGoal: { type: Number, default: 10 },
  weeklyInterviewsGoal: { type: Number, default: 2 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Goals", GoalsSchema);