import mongoose from "mongoose";
const ResumeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Untitled" },
    ownerId: { type: String, required: true },
    templateId: { type: String, default: null },
    content: { type: Object, default: {} },
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("Resume", ResumeSchema);