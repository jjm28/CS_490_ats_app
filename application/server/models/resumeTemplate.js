import mongoose from "mongoose";

const { Schema } = mongoose;

const StyleSchema = new Schema(
  {
    primary: { type: String, default: "#0ea5e9" }, // hex color
    font: { type: String, default: "Inter" },      // font token/name
  },
  { _id: false }
);

const LayoutSchema = new Schema(
  {
    columns: { type: Number, enum: [1, 2], default: 1 },
    sections: {
      type: [String],
      default: ["header", "summary", "experience", "education", "skills"],
    },
  },
  { _id: false }
);

const ResumeTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ["chronological", "functional", "hybrid", "custom"],
      required: true,
    },
    style: { type: StyleSchema, default: () => ({}) },
    layout: { type: LayoutSchema, default: () => ({}) },

    // Note: system templates can have ownerId = null
    ownerId: { type: String, index: true, default: null },
    isFileTemplate: { type: Boolean, default: false },           
    fileName: { type: String, default: null },                   
    fileType: { type: String, default: null },                  
    fileUrl: { type: String, default: null },

    origin: { type: String, enum: ["system", "user", "import"], default: "user" },
    isShared: { type: Boolean, default: true }, // visible to all by default
    sharedWith: [{ type: String }],             // optional explicit share list

    isDefaultForOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ResumeTemplateSchema.index({ ownerId: 1, updatedAt: -1 });

const ResumeTemplate =
  mongoose.models.ResumeTemplate ||
  mongoose.model("ResumeTemplate", ResumeTemplateSchema);

export default ResumeTemplate;
