import mongoose from 'mongoose';

const { Schema } = mongoose;

// NEW: Contact Schema for structured contact information
const ContactSchema = new Schema({
    name: {
        type: String,
        default: '',
        maxlength: 150
    },
    email: {
        type: String,
        default: '',
        maxlength: 150,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        default: '',
        maxlength: 20
    },
    linkedIn: {
        type: String,
        default: '',
        maxlength: 200
    },
    notes: {
        type: String,
        default: '',
        maxlength: 500
    }
}, { _id: false });

const ApplicationHistorySchema = new Schema({
    action: {
        type: String,
        required: true,
        maxlength: 200
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

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

    // Basic job info
    jobTitle: { type: String, required: true, maxlength: 150 },
    company: { type: String, required: true, maxlength: 150 },
    location: { type: String, default: '', maxlength: 150 },
    salaryMin: { type: Schema.Types.Decimal128 },
    salaryMax: { type: Schema.Types.Decimal128 },
    jobPostingUrl: { type: String, default: '' },
    applicationDeadline: { type: Date },
    description: { type: String, default: '', maxlength: 2000 },
    industry: { type: String, index: true },
    type: { type: String, index: true },

    // Status tracking fields
    status: {
        type: String,
        enum: ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'],
        default: 'interested',
        index: true
    },
    statusHistory: [StatusHistorySchema],

    // UPDATED: Structured contact information
    recruiter: ContactSchema,
    hiringManager: ContactSchema,
    // Optional: Add other contacts as needed
    additionalContacts: [ContactSchema],

    // Notes fields
    notes: {
        type: String,
        default: ''
    },
    salaryNotes: {
        type: String,
        default: ''
    },
    interviewNotes: {
        type: String,
        default: ''
    },

    // Application history tracking
    applicationHistory: [ApplicationHistorySchema]
}, { timestamps: true });

// Compound index for efficient status queries
JobSchema.index({ userId: 1, status: 1 });

// Middleware to automatically add to statusHistory when status changes
JobSchema.pre('save', function(next) {
    if (this.isModified('status')) {
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

// NEW: User Preferences Schema (separate collection)
// Supports multiple named saved searches
const SavedSearchSchema = new Schema({
    name: { 
        type: String, 
        required: true,
        maxlength: 100
    },
    searchQuery: { type: String, default: '' },
    statusFilter: { type: String, default: 'All' },
    industryFilter: { type: String, default: 'All' },
    locationFilter: { type: String, default: '' },
    salaryMinFilter: { type: String, default: '' },
    salaryMaxFilter: { type: String, default: '' },
    deadlineStartFilter: { type: String, default: '' },
    deadlineEndFilter: { type: String, default: '' },
    sortBy: { 
        type: String, 
        enum: ['dateAdded', 'deadline', 'salary', 'company'],
        default: 'dateAdded' 
    },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const UserPreferencesSchema = new Schema({
    userId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    // Array of saved searches
    savedSearches: [SavedSearchSchema],
    // Last used search (auto-saved, no name)
    lastSearch: {
        searchQuery: { type: String, default: '' },
        statusFilter: { type: String, default: 'All' },
        industryFilter: { type: String, default: 'All' },
        locationFilter: { type: String, default: '' },
        salaryMinFilter: { type: String, default: '' },
        salaryMaxFilter: { type: String, default: '' },
        deadlineStartFilter: { type: String, default: '' },
        deadlineEndFilter: { type: String, default: '' },
        sortBy: { 
            type: String, 
            enum: ['dateAdded', 'deadline', 'salary', 'company'],
            default: 'dateAdded' 
        }
    }
}, { timestamps: true });

const Jobs = mongoose.models.Jobs || mongoose.model('Jobs', JobSchema);
const UserPreferences = mongoose.models.UserPreferences || mongoose.model('UserPreferences', UserPreferencesSchema);

export default Jobs;
export { UserPreferences };