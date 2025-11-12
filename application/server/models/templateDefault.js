import mongoose from 'mongoose';

const { Schema } = mongoose;

const TemplateDefaultSchema = new Schema(
  {
    // One default per user
    userId: { type: String, required: true, unique: true, index: true },
    // References a ResumeTemplate._id (stored as string in your other models)
    templateId: { type: String, required: true },
  },
  { timestamps: true }
);

const TemplateDefault =
  mongoose.models.TemplateDefault ||
  mongoose.model('TemplateDefault', TemplateDefaultSchema);

export default TemplateDefault;
