// models/Advisor/AdvisorAvailability.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const WeeklySlotSchema = new Schema(
  {
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    // "HH:MM" 24h, e.g. "18:00"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const AdvisorAvailabilitySchema = new Schema(
  {
    advisorUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    weeklySlots: {
      type: [WeeklySlotSchema],
      default: [],
    },
    sessionTypes: {
      type: [String],
      default: [], // e.g. ["Resume review", "Mock interview"]
    },
    timezone: {
      type: String,
      default: "America/New_York",
    },
  },
  { timestamps: true }
);

const AdvisorAvailability =
  mongoose.models.AdvisorAvailability ||
  mongoose.model("AdvisorAvailability", AdvisorAvailabilitySchema);

export default AdvisorAvailability;
