import mongoose from "mongoose";

const OfferComparisonSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    jobIds: { type: [String], default: [] },
    inputs: { type: Object, default: {} },
    result: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model(
  "OfferComparisonSnapshot",
  OfferComparisonSnapshotSchema
);
