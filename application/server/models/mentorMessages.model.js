import mongoose from "mongoose";

const MentorMessageSchema = new mongoose.Schema({
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: "mentorCollaborations", required: true },
  sender: { type: String, enum: ["mentor", "user"], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("MentorMessage", MentorMessageSchema);
