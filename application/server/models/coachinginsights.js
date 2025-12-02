import mongoose from "mongoose";

const InterviewCoachingInsightSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questionId: { type: String, required: true },
  
  response: { type: String, required: true },

  scores: {
    relevance: Number,
    specificity: Number,
    impact: Number,
    clarity: Number,
  },

  star: {
    situation: String,
    task: String,
    action: String,
    result: String,
  },

  weaknesses: [String],
  suggestions: [String],
  alternativeApproach: String,

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("InterviewCoachingInsight", InterviewCoachingInsightSchema);
