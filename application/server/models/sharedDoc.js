import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const sharedDocSchema = new mongoose.Schema({
  kind: { type: String, enum: ["resume", "coverletter"], required: true },
  candidateId: { type: String, required: true },
  viewerId: { type: String, required: true },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("SharedDoc", sharedDocSchema);
