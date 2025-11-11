import mongoose from "mongoose";
const TemplateDefaultSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    templateId: { type: String, required: true },
  },
  { timestamps: true }
);
export default mongoose.model("TemplateDefault", TemplateDefaultSchema);