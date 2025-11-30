import mongoose from "mongoose";

const SupportUpdateSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true }, // job seeker

    type: {
      type: String,
      enum: ["WEEKLY_SUMMARY", "TODAY_FEELING", "PLAN", "OTHER"],
      default: "OTHER",
    },

    title: { type: String, required: true },
    body: { type: String, required: true },

    // Optional vibe tag
    toneTag: {
      type: String,
      enum: ["positive", "mixed", "tough", "neutral", null],
      default: null,
    },

    visibility: {
      type: String,
      enum: ["all", "custom"],
      default: "all",
    },

    // If visibility === "custom", only these supporters see it
    visibleToSupporterIds: [{ type: String, index: true }],

    // 🔮 Future reactions support (you can build UI later)
    reactions: [
      {
        supporterId: { type: String },
        emoji: { type: String }, // e.g. "👍", "❤️"
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const SupportUpdate = mongoose.model(
  "SupportUpdate",
  SupportUpdateSchema
);
export default SupportUpdate;
