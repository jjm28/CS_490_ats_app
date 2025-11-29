// models/GroupChallengeParticipation.js
import mongoose from "mongoose";
import { string } from "zod";

const GroupChallengeParticipationSchema = new mongoose.Schema(
  {
    challengeId: {
      type: String,
      ref: "GroupChallenge",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    progressValue: { type: Number, default: 0 }, // cumulative
    joinedAt: { type: Date, default: Date.now },
    lastUpdateAt: { type: Date, default: Date.now },

    lastNote: { type: String, default: "" }, // optional accountability note
  },
  { timestamps: true }
);

// one participation per user/challenge
GroupChallengeParticipationSchema.index(
  { challengeId: 1, userId: 1 },
  { unique: true }
);

const GroupChallengeParticipation  = mongoose.model(
  "GroupChallengeParticipation",
  GroupChallengeParticipationSchema
);
export default GroupChallengeParticipation
