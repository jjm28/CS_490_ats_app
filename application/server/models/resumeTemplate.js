import mongoose from 'mongoose';

const { Schema } = mongoose;

const ResumeTemplateSchema = new Schema(
  {
    // Null/absent userId indicates a system/global template; otherwise user-owned
    userId: { type: String, index: true, default: null },

    title: { type: String, required: true, maxlength: 200 },
    type: {
      type: String,
      enum: ['chronological', 'functional', 'hybrid'],
      required: true,
      index: true,
    },

    // Mark origin for quick filtering (system vs user)
    origin: { type: String, enum: ['system', 'user'], default: 'system', index: true },

    // Theme/style payload for the template
    style: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Fetch user templates quickly and show newest first
ResumeTemplateSchema.index({ userId: 1, updatedAt: -1 });

const ResumeTemplate =
  mongoose.models.ResumeTemplate ||
  mongoose.model('ResumeTemplate', ResumeTemplateSchema);

export default ResumeTemplate;
