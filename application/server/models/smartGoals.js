import mongoose from "mongoose";

const ShortTermGoalSchema = new mongoose.Schema({
    title: String,
    deadline: String,
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    linkedJobId: { type: String, default: null }  // <--- add this
});

const GoalSchema = new mongoose.Schema({
    userId: { type: String, required: true },

    linkedJobId: { type: String, default: null },   // ← ADD THIS !!!

    specific: { type: String, required: true },
    measurable: { type: String, default: "Progress tracked automatically by OnTrack." },
    achievable: { type: Boolean, required: true },
    relevant: { type: Boolean, required: true },
    deadline: { type: Date, required: true },

    shortTermGoals: [ShortTermGoalSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Goal", GoalSchema);