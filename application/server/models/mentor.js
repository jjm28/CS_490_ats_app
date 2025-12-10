import mongoose from "mongoose";

const RecommendationSchema = new mongoose.Schema({
  text: { type: String, required: true },
  implemented: { type: Boolean, default: false },
  dueDate: { type: Date, default: null },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const MentorSchema = new mongoose.Schema({
  menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  mentorEmail: { type: String, required: true },

  relationship: { type: String, default: "Mentor" },

  accepted: { type: Boolean, default: false },

  permissions: {
    shareProfile: { type: Boolean, default: false },
    shareApplications: { type: Boolean, default: false },
    shareAnalytics: { type: Boolean, default: false },
  },

  recommendations: [RecommendationSchema],
}, { timestamps: true });

export default mongoose.model("Mentorship", MentorSchema);
