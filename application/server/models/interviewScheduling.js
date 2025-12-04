// models/InterviewScheduling.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const InterviewSchedulingSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Jobs", required: true }, // link to job

  type: {                                     // e.g. phone, video, in-person
    type: String,
    enum: ["phone", "video", "in-person", "technical", "behavioral"],
    required: true,
  },

  date: { type: Date, required: true },
  locationOrLink: { type: String, default: "" },
  interviewer: { type: String, default: "" },
  contactInfo: { type: String, default: "" },

  notes: { type: String, default: "" },

  confidenceLevel: { type: Number, default: null },
  anxietyLevel: { type: Number, default: null },

  outcome: {
    type: String,
    enum: ["pending", "passed", "rejected", "offer"],
    default: "pending",
  },

  reminderSent: { type: Boolean, default: false },
  eventId: { type: String, default: "" }, // for Google Calendar integration
}, { timestamps: true });

const InterviewScheduling =
  mongoose.models.InterviewScheduling ||
  mongoose.model("InterviewScheduling", InterviewSchedulingSchema);

export default InterviewScheduling;