import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommentSchema = new mongoose.Schema({
  viewerId: { type: String, required: false },
  text: String,
  createdAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
});

const ResumeSchema = new Schema(
  {
    // Canonical owner field (match other models)
    userId: { type: String, required: true, index: true },
    

    // Core resume fields
    filename: { type: String, required: true, maxlength: 200 },
    templateKey: {
      type: String,
      enum: ['chronological', 'functional', 'hybrid'],
      required: true,
      index: true,
    },
    resumedata: { type: Schema.Types.Mixed, required: true }, // flexible JSON blob
    lastSaved: { type: Date },

    // Optional metadata
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

// Helpful listing/sorting index pattern (like your other models)
ResumeSchema.index({ userId: 1, updatedAt: -1 });

const Resume =
  mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);



export default Resume;
