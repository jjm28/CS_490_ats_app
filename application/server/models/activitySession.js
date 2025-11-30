// models/activitySession.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const ActivitySessionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // Optional: tie to a specific job
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Jobs",
      default: null,
    },
    // e.g. "job_search" | "job_research" | "resume_edit" | "coverletter_edit"
    activityType: {
      type: String,
      required: true,
      enum: [
        "job_search",
        "job_research",
        "resume_edit",
        "coverletter_edit",
      ],
    },
    // Extra context like "JobsEntry", "CompanyResearchInline", "ResumeEditor"
    context: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
      index: true,
    },
    // cached duration in minutes once session is closed
    durationMinutes: {
      type: Number,
      default: null,
    },
    // Optional energy/workload indicators
    energyLevelStart: {
      type: Number, // 1–5
      min: 1,
      max: 5,
      default: null,
    },
    energyLevelEnd: {
      type: Number, // 1–5
      min: 1,
      max: 5,
      default: null,
    },
    // Could reuse for “stress” or notes later if needed
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Defensive export to avoid OverwriteModelError in dev
const ActivitySession =
  mongoose.models.ActivitySession ||
  mongoose.model("ActivitySession", ActivitySessionSchema);

export default ActivitySession;
