import mongoose from "mongoose";

const InterviewQuestionsSchema = new mongoose.Schema({
  jobId: { type: String, ref: "Job", required: true },
  userId: { type: String, ref: "User", required: true },
  jobTitle: String,
  company: String,
  technicalQuestions: [{ question: String }],
  behavioralQuestions: [{ question: String }],
  generalQuestions: [{ question: String, companySpecific: Boolean }],
  generatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("InterviewQuestions", InterviewQuestionsSchema);