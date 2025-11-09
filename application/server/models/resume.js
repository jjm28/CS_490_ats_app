import mongoose from "mongoose";

const { Schema } = mongoose;

const ResumeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    templateId: { type: String, ref: "ResumeTemplate", default: null }, // storing string id for simplicity
    ownerId: { type: String, required: true, index: true },
    content: { type: Schema.Types.Mixed, default: {} },
    archived: { type: Boolean, default: false },
    tags: { type: [String], default: [] },        
    groupId: { type: String, default: null },     
    version: { type: Number, default: 1 }, 
  },
  { timestamps: true }
);

ResumeSchema.index({ ownerId: 1, updatedAt: -1 });

const Resume =
  mongoose.models.Resume || mongoose.model("Resume", ResumeSchema);

export default Resume;
