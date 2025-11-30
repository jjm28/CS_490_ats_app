// models/GroupChallenge.js
import mongoose from "mongoose";
import string from "zod";

const GroupChallengeSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      ref: "PeerGroup",
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    type: {
      type: String,
      enum: ["applications", "outreach", "practice", "other"],
      default: "applications",
    },

    targetValue: { type: Number, required: true }, // e.g. 10
    unitLabel: { type: String, default: "actions" }, // e.g. "applications"

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const GroupChallenge = mongoose.model("GroupChallenge", GroupChallengeSchema);
export default GroupChallenge