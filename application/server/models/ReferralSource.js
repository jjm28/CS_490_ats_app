import mongoose from "mongoose";

const ReferralSourceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    name: String,
    email: String,
    companyRole: String,
    relationship: String,

    likelihoodScore: Number,   // 0–1 (AI computed)
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("ReferralSource", ReferralSourceSchema);
