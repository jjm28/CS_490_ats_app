// models/ApiCall.js
import mongoose from 'mongoose';

const apiCallSchema = new mongoose.Schema({
  apiName: {
    type: String,
    required: true,
    enum: [
      'openai',
      'gemini',
      'github',
      'google',
      'microsoft',
      'linkedin',
      'newsapi',
      'adzuna',
      'careeronestop',
      'google-search'
    ]
  },
  endpoint: String,
  method: String,
  statusCode: Number,
  responseTimeMs: Number,
  success: Boolean,
  errorMessage: String,
  timestamp: { type: Date, default: Date.now }
});

const ApiCall = mongoose.model('ApiCall', apiCallSchema);

export default ApiCall;
