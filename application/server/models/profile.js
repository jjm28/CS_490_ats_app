import mongoose from 'mongoose';

const { Schema } = mongoose;

const ProfileSchema = new Schema(
  {
    userId: { type: String, index: true }, 
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
    // optional
    profileType: { type: String, default: 'default' },
    photoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);


// ProfileSchema.index({ userId: 1, profileType: 1 }, { unique: true });

export default mongoose.model('Profile', ProfileSchema);