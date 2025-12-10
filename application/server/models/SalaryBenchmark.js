// models/SalaryBenchmark.js
import mongoose from "mongoose";

const SalaryBenchmarkSchema = new mongoose.Schema(
  {
    // Optional: first job that triggered this cache entry
    jobId: { type: String },

    // Keys used for cache lookups (lowercased)
    jobTitleKey: { type: String, index: true },    // e.g. "software developers"
    locationKey: { type: String, index: true },    // e.g. "new york, ny" or "us"

    // Display fields for UI
    displayTitle: { type: String },       // "Software Developers"
    displayLocation: { type: String },    // "New York, NY" or "United States (national)"

    // Core wage info
    currency: { type: String, default: "USD" },
    period: { type: String, default: "year" },

    min: { type: Number },
    max: { type: Number },
    p10: { type: Number },
    p25: { type: Number },
    p50: { type: Number },
    p75: { type: Number },
    p90: { type: Number },
    mean: { type: Number },

    wageYear: { type: String },
    occupationCode: { type: String },

    sources: [{ type: String }],

    hasData: { type: Boolean, default: false },

    // Whether this is location-specific or national fallback
    scope: {
      type: String,
      enum: ["location", "national", "none"],
      default: "none",
    },

    lastFetchedAt: { type: Date },

    // Optional debug payload
    raw: { type: Object },
  },
  { timestamps: true }
);

const SalaryBenchmark = mongoose.model("SalaryBenchmark", SalaryBenchmarkSchema);
export default SalaryBenchmark;
