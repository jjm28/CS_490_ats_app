// models/interviewSuccessPrediction.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const FactorBreakdownSchema = new Schema({
  preparationScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 0 
  },
  companyResearchScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 0 
  },
  practiceScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 0 
  },
  historicalPerformance: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: 0 
  },
  roleMatchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: false });

const RecommendationSchema = new Schema({
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  category: {
    type: String,
    enum: ['preparation', 'research', 'practice', 'timing', 'strategy'],
    required: true
  },
  action: {
    type: String,
    required: true,
    maxlength: 500
  },
  potentialImpact: {
    type: Number,
    min: 0,
    max: 50, // max impact on probability score
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, { _id: false });

const InterviewSuccessPredictionSchema = new Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Jobs',
    required: true,
    index: true
  },
  interviewId: {
    type: String, // The _id from jobs.interviews[] array
    required: true
  },
  
  // Core prediction data
  successProbability: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Detailed factor breakdown
  factors: {
    type: FactorBreakdownSchema,
    required: true
  },
  
  // Factor weights used in calculation (for transparency)
  weights: {
    preparation: { type: Number, default: 0.25 },
    companyResearch: { type: Number, default: 0.20 },
    practice: { type: Number, default: 0.25 },
    historicalPerformance: { type: Number, default: 0.20 },
    roleMatch: { type: Number, default: 0.10 }
  },
  
  // Actionable recommendations
  recommendations: [RecommendationSchema],
  
  // Context about the interview (snapshot for reference)
  interviewContext: {
    company: String,
    jobTitle: String,
    interviewType: String,
    interviewDate: Date,
    daysUntilInterview: Number
  },
  
  // Track accuracy after interview completes
  actualOutcome: {
    type: String,
    enum: ['pending', 'passed', 'rejected', 'offer'],
    default: 'pending'
  },
  predictionAccurate: {
    type: Boolean,
    default: null // null until outcome is known
  },
  accuracyScore: {
    type: Number, // difference between predicted and actual (0-100)
    default: null
  },
  outcomeRecordedAt: {
    type: Date
  },
  
  // Metadata
  predictedAt: {
    type: Date,
    default: Date.now
  },
  lastRecalculatedAt: {
    type: Date
  },
  calculationVersion: {
    type: String,
    default: 'v1.0' // track algorithm version for future improvements
  }
}, { 
  timestamps: true 
});

// Compound indexes for efficient queries
InterviewSuccessPredictionSchema.index({ userId: 1, jobId: 1 });
InterviewSuccessPredictionSchema.index({ userId: 1, interviewId: 1 });
InterviewSuccessPredictionSchema.index({ userId: 1, 'interviewContext.interviewDate': 1 });

// Middleware to calculate prediction accuracy when outcome is set
InterviewSuccessPredictionSchema.pre('save', function(next) {
  if (this.isModified('actualOutcome') && this.actualOutcome !== 'pending') {
    // Simple accuracy calculation
    // If predicted >70% and got offer/passed = accurate
    // If predicted <30% and got rejected = accurate
    // If predicted 30-70%, consider it medium accuracy
    
    const isPositiveOutcome = ['passed', 'offer'].includes(this.actualOutcome);
    const isNegativeOutcome = this.actualOutcome === 'rejected';
    
    if ((this.successProbability >= 70 && isPositiveOutcome) ||
        (this.successProbability <= 30 && isNegativeOutcome)) {
      this.predictionAccurate = true;
      this.accuracyScore = 100;
    } else if ((this.successProbability >= 70 && isNegativeOutcome) ||
               (this.successProbability <= 30 && isPositiveOutcome)) {
      this.predictionAccurate = false;
      this.accuracyScore = 0;
    } else {
      // Medium range prediction
      this.predictionAccurate = null;
      this.accuracyScore = 50;
    }
    
    this.outcomeRecordedAt = new Date();
  }
  next();
});

const InterviewSuccessPrediction = mongoose.models.InterviewSuccessPrediction || 
  mongoose.model('InterviewSuccessPrediction', InterviewSuccessPredictionSchema);

export default InterviewSuccessPrediction;