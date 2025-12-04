import mongoose from "mongoose";

const ReferralTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    templateText: String,
    tone: String
  },
  { timestamps: true }
);

export default mongoose.model("ReferralTemplate", ReferralTemplateSchema);
