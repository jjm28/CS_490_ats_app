import mongoose from "mongoose";

const NetworkingAnalyticsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // Track UC requirements:
  suggestionsViewed: { type: Number, default: 0 },
  connectionsAddedFromSuggestions: { type: Number, default: 0 },
  
}, { timestamps: true });

export default mongoose.models.NetworkingAnalytics ||
  mongoose.model("NetworkingAnalytics", NetworkingAnalyticsSchema);
