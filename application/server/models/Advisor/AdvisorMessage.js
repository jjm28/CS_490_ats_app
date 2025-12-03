// models/Advisor/AdvisorMessage.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AdvisorMessageSchema = new Schema(
  {
    relationshipId: {
      type: Schema.Types.ObjectId,
      ref: "AdvisorRelationship",
      required: true,
      index: true,
    },

    // denormalized for convenience
    ownerUserId: { type: String, required: true, index: true },   // candidate
    advisorUserId: { type: String, required: true, index: true }, // advisor

    senderRole: {
      type: String,
      enum: ["candidate", "advisor"],
      required: true,
    },
    senderUserId: { type: String, required: true },

    body: { type: String, required: true, maxlength: 5000 },

    isReadByCandidate: { type: Boolean, default: false },
    isReadByAdvisor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AdvisorMessageSchema.index({ relationshipId: 1, createdAt: 1 });

const AdvisorMessage =
  mongoose.models.AdvisorMessage ||
  mongoose.model("AdvisorMessage", AdvisorMessageSchema);

export default AdvisorMessage;
