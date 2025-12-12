// server/models/geocodeCache.js
import mongoose from "mongoose";

const GeocodeCacheSchema = new mongoose.Schema(
  {
    query: { type: String, unique: true, index: true }, // normalized query
    lat: Number,
    lng: Number,
    raw: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const GeocodeCache = mongoose.model("GeocodeCache", GeocodeCacheSchema);
export default GeocodeCache;
