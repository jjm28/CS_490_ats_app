// Mongoose ResumeTemplate model
import mongoose from "mongoose";
const ResumeTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["chronological", "functional", "hybrid"], required: true },
    ownerId: { type: String, default: null }, // null = system
    origin: { type: String, enum: ["system", "user"], default: "system" },
    style: { type: Object, default: {} },
  },
  { timestamps: true }
);
export default mongoose.model("ResumeTemplate", ResumeTemplateSchema);
