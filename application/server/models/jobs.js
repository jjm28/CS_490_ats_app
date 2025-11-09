import mongoose from 'mongoose';

const { Schema } = mongoose;

const StatusHistorySchema = new Schema({
    status: {
        type: String,
        enum: ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String,
        maxlength: 500
    }
}, { _id: false });

const JobSchema = new Schema({
    userId: { type: String, ref: 'User', required: true, index: true },

    jobTitle: { type: String, required: true, maxlength: 150 },
    company: { type: String, required: true, maxlength: 150 },
    location: { type: String, default: '', maxlength: 150 },
    salaryMin: { type: Schema.Types.Decimal128 },
    salaryMax: { type: Schema.Types.Decimal128 },
    jobPostingUrl: { type: String, default: '' },
    applicationDeadline: { type: Date },
    description: { type: String, default: '', maxlength: 2000 },
    industry: { type: String, index: true},
    type: { type: String, index: true },

    // NEW: Status tracking fields
    status: {
        type: String,
        enum: ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'],
        default: 'interested',
        index: true
    },
    statusHistory: [StatusHistorySchema]
}, { timestamps: true });

// Compound index for efficient status queries
JobSchema.index({ userId: 1, status: 1 });
// Middleware to automatically add to statusHistory when status changes
JobSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        // Only add to history if status actually changed
        const lastHistory = this.statusHistory[this.statusHistory.length - 1];
        if (!lastHistory || lastHistory.status !== this.status) {
            this.statusHistory.push({
                status: this.status,
                timestamp: new Date()
            });
        }
    }
    next();
});

const Jobs = mongoose.models.Jobs || mongoose.model('Jobs', JobSchema);

export default Jobs;
