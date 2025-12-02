// models/WritingPracticeSession.js
import mongoose from "mongoose";

const responseAnalysisSchema = new mongoose.Schema({
  question: { type: String, required: true },
  response: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['behavioral', 'technical', 'situational'],
    required: true 
  },
  
  // AI Analysis Results
  overallScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    required: true
  },
  structureScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  clarityScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  storytellingScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  
  // Detailed Feedback
  feedback: { type: String }, // Overall AI feedback
  strengths: [String], // What was done well
  improvements: [String], // What to improve
  
  // Response Metadata
  wordCount: { type: Number },
  timeSpentSeconds: { type: Number }, // How long they took to write
  hasSTARElements: { type: Boolean, default: false }, // For behavioral questions
  
  analyzedAt: { type: Date, default: Date.now }
}, { _id: false });

const writingPracticeSessionSchema = new mongoose.Schema({
  userId: { 
    type: String, // UUID format
    required: true,
    index: true
  },
  jobId: { 
    type: String, // UUID format
    required: true,
    index: true
  },
  
  // Session Metadata
  title: { 
    type: String, 
    default: "Writing Practice Session" 
  },
  sessionType: {
    type: String,
    enum: ['timed', 'untimed'],
    default: 'timed'
  },
  timerDuration: { 
    type: Number, // in seconds (120, 300, 600, or null for untimed)
  },
  totalDuration: { 
    type: Number, // actual time spent in seconds
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  
  // Responses and Analysis
  responses: [responseAnalysisSchema],
  
  // Overall Session Metrics
  averageOverallScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  averageStructureScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  averageClarityScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  averageStorytellingScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  totalResponses: { 
    type: Number, 
    default: 0 
  },
  
  // Improvement Tracking
  improvementFromLastSession: {
    type: Number, // Percentage change
    default: null
  }
}, { 
  timestamps: true // adds createdAt, updatedAt
});

// Compound index for efficient queries
writingPracticeSessionSchema.index({ userId: 1, jobId: 1 });
writingPracticeSessionSchema.index({ userId: 1, createdAt: -1 });

// Calculate averages before saving
writingPracticeSessionSchema.pre('save', function(next) {
  if (this.responses.length > 0) {
    this.totalResponses = this.responses.length;
    
    this.averageOverallScore = Math.round(
      this.responses.reduce((sum, r) => sum + r.overallScore, 0) / this.responses.length
    );
    
    const structureScores = this.responses.filter(r => r.structureScore != null);
    if (structureScores.length > 0) {
      this.averageStructureScore = Math.round(
        structureScores.reduce((sum, r) => sum + r.structureScore, 0) / structureScores.length
      );
    }
    
    const clarityScores = this.responses.filter(r => r.clarityScore != null);
    if (clarityScores.length > 0) {
      this.averageClarityScore = Math.round(
        clarityScores.reduce((sum, r) => sum + r.clarityScore, 0) / clarityScores.length
      );
    }
    
    const storytellingScores = this.responses.filter(r => r.storytellingScore != null);
    if (storytellingScores.length > 0) {
      this.averageStorytellingScore = Math.round(
        storytellingScores.reduce((sum, r) => sum + r.storytellingScore, 0) / storytellingScores.length
      );
    }
  }
  next();
});

export default mongoose.model("WritingPracticeSession", writingPracticeSessionSchema);