// models/successSnapshot.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const SuccessSnapshotSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    payload: { type: Schema.Types.Mixed, required: true }, // Full overview snapshot
  },
  { timestamps: true }
);

// Prevent duplicate daily snapshots
SuccessSnapshotSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export default mongoose.models.SuccessSnapshot ||
  mongoose.model("SuccessSnapshot", SuccessSnapshotSchema, "successSnapshots");
