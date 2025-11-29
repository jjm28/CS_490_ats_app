// models/PracticeSession.js
import mongoose from "mongoose";

const questionResponseSchema = new mongoose.Schema({
  question: { type: String, required: true },
  response: { type: String, required: true },
  aiFeedback: String,
  score: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  category: { type: String } // e.g., "behavioral", "technical", "system-design"
}, { _id: false }); // embed without extra _id

const practiceSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Job", 
    required: true,
    index: true
  },
  
  // Session metadata
  title: { 
    type: String, 
    default: "Interview Practice Session" 
  },
  duration: { 
    type: Number, // in seconds
    required: false 
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  
  // Array of Q&A interactions
  questions: [questionResponseSchema],
  
  // Overall session metrics
  averageScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  totalQuestions: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true // adds createdAt, updatedAt
});

// Compound index for user + job queries
practiceSessionSchema.index({ userId: 1, jobId: 1 });

export default mongoose.model("PracticeSession", practiceSessionSchema);