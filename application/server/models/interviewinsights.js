// models/interviewInsights.js
import mongoose from 'mongoose';

const interviewInsightsSchema = new mongoose.Schema({
  // Links to which job and user this belongs to
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Just basic reference info (not bloat)
  jobTitle: String,
  company: String,
  
  // The actual insights (cleaned/validated data only)
  processStages: [String],
  commonQuestions: [String],
  interviewFormat: String,
  timeline: String,
  preparationTips: [String],
  successTips: [String],
  interviewerInfo: String,
  
  // When it was created
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Auto-delete after 90 days (optional)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }
}, { 
  timestamps: true 
});

// Make sure each job+user combo only has one insights document
interviewInsightsSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// MongoDB will auto-delete documents when expiresAt date is reached
interviewInsightsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('InterviewInsights', interviewInsightsSchema);