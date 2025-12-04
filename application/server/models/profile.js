import mongoose from 'mongoose';

const { Schema } = mongoose;



const ProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: String,
    email: String,
    phone: String,
    location: {
      city: String,
      state: String,
    },
    headline: String,
    bio: String,
    industry: String,
    experienceLevel: String,
     // 🆕 LinkedIn Profile Optimization Data
    linkedInProfileUrl: String,
    linkedInOptimization: {
      // User-provided context (persisted)
      currentRole: String,
      yearsOfExperience: String,
      targetRole: String,
      skills: String,
      
      // AI-generated suggestions (persisted)
      suggestions: [{
        category: {
          type: String,
          enum: ['headline', 'summary', 'experience', 'skills', 'other']
        },
        suggestion: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low']
        },
        completed: { type: Boolean, default: false },
        completedAt: Date,
        notes: String, // User can add notes on implementation
      }],
    },
    // optional
    profileType: { type: String, default: 'default' },
    photoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);


// ProfileSchema.index({ userId: 1, profileType: 1 }, { unique: true });

export default mongoose.model('Profile', ProfileSchema);