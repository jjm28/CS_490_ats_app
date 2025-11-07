import mongoose from 'mongoose';

const { Schema } = mongoose;

const JobSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    jobTitle: { type: String, required: true, maxlength: 150 },
    company: { type: String, required: true, maxlength: 150 },
    location: { type: String, default: '', maxlength: 150 },
    salaryMin: { type: Schema.Types.Decimal128 },
    salaryMax: { type: Schema.Types.Decimal128 },
    jobPostingUrl: { type: String, default: '' },
    applicationDeadline: { type: Date },
    description: { type: String, default: '', maxlength: 2000 },
    industry: { type: String, required: true, index: true},
    type: { type: String, required: true, index: true }
}, {timestamps: true})

const Jobs =
  mongoose.models.Jobs || mongoose.model('Jobs', JobSchema);

export default Jobs;