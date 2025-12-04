import mongoose from "mongoose";

const TeamInsightSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("TeamInsight", TeamInsightSchema);
