import mongoose from "mongoose";

const WellbeingSettingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    resetPlan: { type: String, default: "" }, // your personal coping plan text
  },
  { timestamps: true }
);

const WellbeingSettings = mongoose.model(
  "WellbeingSettings",
  WellbeingSettingsSchema
);
export default WellbeingSettings;
