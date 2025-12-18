import mongoose from "mongoose";

const { Schema } = mongoose;

const ApplicationScheduleSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Jobs", required: true },
    scheduledAt: { type: Date, required: true },
    deadlineAt: { type: Date },
    timezone: { type: String, default: "America/New_York" },
    notificationEmail: { type: String },
    reminders: [
      {
        kind: String,
        offsetMinutes: Number,
        remindAt: Date,
        sentAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ["scheduled", "submitted", "expired", "cancelled"],
      default: "scheduled",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastProcessedAt: { type: Date },
    notes: [String],
    googleCalendarEventId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.ApplicationSchedule ||
  mongoose.model("ApplicationSchedule", ApplicationScheduleSchema);
