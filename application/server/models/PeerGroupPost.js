// models/PeerGroupPost.js
import mongoose from "mongoose";

const PeerGroupPostSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      ref: "PeerGroup",
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    // main content
    content: { type: String, required: true },

    // optional classification for later (insight, question, etc.)
    type: {
      type: String,
      enum: ["insight", "question", "strategy", "other"],
      default: "insight",
    },
        highlightType: {
              type: String,
              enum: ["success", "learning", null],
              default: null,
            },
    // soft delete toggle if you want later
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PeerGroupPost = mongoose.model("PeerGroupPost", PeerGroupPostSchema);
export default PeerGroupPost
