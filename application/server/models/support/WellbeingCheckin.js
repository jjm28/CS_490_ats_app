// models/WellbeingCheckin.js
import mongoose from "mongoose";

const WellbeingCheckinSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // owner (job seeker)

    // 1–5 scale (1 = very low / very bad, 5 = very good)
    stressLevel: { type: Number, min: 1, max: 5, required: true },
    moodLevel: { type: Number, min: 1, max: 5, required: true },

    energyLevel: { type: Number, min: 1, max: 5 }, // optional

    note: { type: String }, // optional short note like "long OA day", "feeling burnt out"
  },
  { timestamps: true } // createdAt, updatedAt
);

const WellbeingCheckin = mongoose.model(
  "WellbeingCheckin",
  WellbeingCheckinSchema
);
export default WellbeingCheckin;
