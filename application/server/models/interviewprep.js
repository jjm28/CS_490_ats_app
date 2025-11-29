import mongoose from "mongoose";

const interviewPrepSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  aiFeedback: String,
  score: Number, // 0–100
}, { timestamps: true });

export default mongoose.model("InterviewPrep", interviewPrepSchema);