import mongoose from 'mongoose';

const { Schema } = mongoose;

const EmploymentSchema = new Schema(
  {
    userId: { type: String, index: true, required: true },

    jobTitle: { type: String, required: true, maxlength: 150 },
    company: { type: String, required: true, maxlength: 150 },
    location: { type: String, default: '', maxlength: 150 },

    startDate: { type: Date, required: true },
    endDate: { type: Date }, // optional when currentPosition is true
    currentPosition: { type: Boolean, default: false },

    description: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

// Optional index for listing newest first by user
EmploymentSchema.index({ userId: 1, startDate: -1, createdAt: -1 });

const Employment =
  mongoose.models.Employment || mongoose.model('Employment', EmploymentSchema);

export default Employment;