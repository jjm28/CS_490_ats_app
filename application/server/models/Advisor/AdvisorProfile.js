// models/Advisor/AdvisorProfile.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AdvisorProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    headline: { type: String, default: "" },
    specialties: { type: [String], default: [] }, // ["resume", "interview", ...]
    isPaidCoach: { type: Boolean, default: false },
    timezone: { type: String, default: "" },
  },
  { timestamps: true }
);

AdvisorProfileSchema.index({ userId: 1 }, { unique: true });

const AdvisorProfile =
  mongoose.models.AdvisorProfile ||
  mongoose.model("AdvisorProfile", AdvisorProfileSchema);

export default AdvisorProfile;
