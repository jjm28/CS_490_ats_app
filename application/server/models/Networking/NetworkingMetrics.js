import mongoose from "mongoose";

const NetworkingMetricsSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // UUID string

  events: { type: Number, default: 0 },
  connections: { type: Number, default: 0 },
  followups: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("NetworkingMetrics", NetworkingMetricsSchema);
