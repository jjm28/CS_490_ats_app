import mongoose from "mongoose";

const InformationalInterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
  // who the interview is with

  insightReport: { type: String, default: "" },

  completed: { type: Boolean, default: false },
completedDate: { type: Date },

  industry: { type: String, default: "" },
  role: { type: String, default: "" },

  requestMessage: { type: String, default: "" },   // outreach template used
  prepNotes: { type: String, default: "" },        // preparation framework output
  followUpMessage: { type: String, default: "" },  // AI-generated follow-up

  scheduledDate: { type: Date },
  completed: { type: Boolean, default: false },

  outcomes: { type: String, default: "" }, // insights learned
  impactOnJobSearch: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("InformationalInterview", InformationalInterviewSchema);
