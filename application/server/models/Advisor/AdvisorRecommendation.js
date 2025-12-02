// models/Advisor/AdvisorRecommendation.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AdvisorRecommendationSchema = new Schema(
  {
    relationshipId: {
      type: Schema.Types.ObjectId,
      ref: "AdvisorRelationship",
      required: true,
      index: true,
    },

    ownerUserId: { type: String, required: true, index: true },   // candidate
    advisorUserId: { type: String, required: true, index: true }, // advisor

    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },

    category: {
      type: String,
      enum: ["resume", "cover_letter", "job", "interview", "general"],
      default: "general",
      index: true,
    },

    // Linked entities – optional, but used when category is resume/job/cover_letter
    jobId: { type: String, default: null },
    resumeId: { type: String, default: null },
    coverLetterId: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "declined"],
      default: "pending",
      index: true,
    },

    createdBy: {
      type: String,
      enum: ["advisor"],
      default: "advisor",
    },

    candidateNote: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AdvisorRecommendationSchema.index({ relationshipId: 1, createdAt: -1 });

const AdvisorRecommendation =
  mongoose.models.AdvisorRecommendation ||
  mongoose.model("AdvisorRecommendation", AdvisorRecommendationSchema);

export default AdvisorRecommendation;
