// models/Advisor/AdvisorSession.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AdvisorSessionSchema = new Schema(
  {
    relationshipId: {
      type: Schema.Types.ObjectId,
      ref: "AdvisorRelationship",
      required: true,
      index: true,
    },
    ownerUserId: { type: String, required: true, index: true }, // candidate
    advisorUserId: { type: String, required: true, index: true },

    createdByRole: {
      type: String,
      enum: ["candidate", "advisor"],
      required: true,
    },
    createdByUserId: {
      type: String,
      required: true,
    },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    sessionType: { type: String, required: true },

    status: {
      type: String,
      enum: ["requested", "confirmed", "completed", "canceled"],
      default: "requested",
      index: true,
    },

    jobId: { type: String, default: null },
    resumeId: { type: String, default: null },
    coverLetterId: { type: String, default: null },

    note: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

AdvisorSessionSchema.index({ advisorUserId: 1, startTime: 1 });

const AdvisorSession =
  mongoose.models.AdvisorSession ||
  mongoose.model("AdvisorSession", AdvisorSessionSchema);

export default AdvisorSession;
