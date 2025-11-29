import mongoose from 'mongoose';

const interviewPrepSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  
  // Company research data
  companyName: String,
  basicInfo: {
    description: String,
    website: String,
    size: String,
    industry: String,
    headquarters: String,
    mission: String,
    values: String,
    culture: String
  },
  leadership: [{
    title: String,
    snippet: String,
    link: String
  }],
  financialHealth: [{
    title: String,
    snippet: String,
    link: String
  }],
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  competitors: [{
    title: String,
    snippet: String,
    link: String
  }],
  news: [{
    title: String,
    snippet: String,
    link: String,
    date: String,
    source: String,
    publishedAt: String,
    category: String,
    relevanceScore: Number,
    summary: String,
    keyPoints: [String]
  }],
  
  lastResearched: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for faster queries
interviewPrepSchema.index({ userId: 1, jobId: 1 });

export default mongoose.model('InterviewPrep', interviewPrepSchema);