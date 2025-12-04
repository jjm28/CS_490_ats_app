import mongoose from "mongoose";

const interviewAnalyticsSchema = new mongoose.Schema({
  userId: { 
    type: String,
    required: true,
    index: true
  },
  jobId: { 
    type: String,
    required: false // Optional - some interviews might not be linked to a job
  },
  
  // Basic Info
  companyName: { 
    type: String, 
    required: true 
  },
  companyType: {
    type: String,
    enum: ['startup', 'mid-size', 'enterprise', 'faang'],
    required: true
  },
  position: { 
    type: String, 
    required: true 
  },
  
  // Interview Details
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  format: {
    type: String,
    enum: ['phone-screen', 'technical', 'behavioral', 'system-design', 'onsite', 'video'],
    required: true
  },
  outcome: {
    type: String,
    enum: ['pending', 'offer', 'rejected', 'withdrew'],
    default: 'pending'
  },
  
  // Scores
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  scores: {
    technical: { type: Number, min: 0, max: 100 },
    problemSolving: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
    behavioral: { type: Number, min: 0, max: 100 },
    systemDesign: { type: Number, min: 0, max: 100 },
    coding: { type: Number, min: 0, max: 100 }
  },
  
  // Metadata
  notes: { type: String },
  isPractice: { 
    type: Boolean, 
    default: false 
  },
  
  // Optional: Link to practice session or scheduled interview
  practiceSessionId: { type: String },
  scheduledInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewScheduling' }
  
}, { 
  timestamps: true 
});

// Compound indexes
interviewAnalyticsSchema.index({ userId: 1, date: -1 });
interviewAnalyticsSchema.index({ userId: 1, outcome: 1 });

export default mongoose.model("interviewAnalytics", interviewAnalyticsSchema);