import mongoose from "mongoose";

const ReferralSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    referrerName: String,
    referrerEmail: String,
    relationship: String,

    status: {
      type: String,
      enum: ["pending", "followup", "completed", "declined"],
      default: "pending"
    },

elationshipStrength: { type: Number, default: 50 },
    successRate: { type: Number, default: 0 },


    requestMessage: String,
    outcome: String,

    dateRequested: { type: Date, default: Date.now },
    nextFollowUp: { type: Date },

  },
  { timestamps: true }
);

export default mongoose.model("Referral", ReferralSchema);
