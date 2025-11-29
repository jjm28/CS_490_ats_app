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
    changedAt: { type: Date, default: Date.now },
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
    companySize: { type: String, default: "Unknown", index: true },
    type: { type: String, index: true },
    applicationMethod: {
        type: String,
        enum: [
            "Easy Apply",
            "Company Portal",
            "Referral",
            "Recruiter",
            "Email",
            "Internal",
            "Other",
        ],
        default: "Other",
        index: true,
    },

    applicationSource: {
        type: String,
        enum: [
            "LinkedIn",
            "Indeed",
            "Company Site",
            "Handshake",
            "Glassdoor",
            "ZipRecruiter",
            "Other",
        ],
        default: "Other",
        index: true,
    },

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
    //  NEW FIELDS - for matching
    matchScore: { type: Number, default: null }, // e.g., 73
    matchBreakdown: {
        skills: { type: Number, default: null }, // e.g., 80
        experience: { type: Number, default: null }, // e.g., 70
        education: { type: Number, default: null } // e.g., 60
    },
    skillGaps: { type: [String], default: [] },
    // Application history tracking
    applicationHistory: [ApplicationHistorySchema],

    // 🚀 Application package generated for this job (UC-069)
    applicationPackage: {
        type: {
            resumeId: String,
            coverLetterId: String,
            portfolioUrls: [String],
            generatedAt: Date,
            generatedByRuleId: String,
        },
        default: null,
    },

    archived: { type: Boolean, default: false },
    archiveReason: { type: String, default: null },
    archivedAt: { type: Date, default: null },

    // optional auto-archive horizon (used by your service if you enable it)
    autoArchiveDays: {
        type: Number,
        min: 1,
        default: 60,
        set: (v) => (v !== undefined && v !== null && v !== "" ? Number(v) : 60),
    },
    autoArchiveDate: { type: Date },

    // Interview scheduling integration
    interviews: [
        {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            type: {
                type: String,
                enum: ["phone", "video", "in-person"],
                required: true,
            },
            date: { type: Date, required: true },
            locationOrLink: { type: String, default: "" },
            notes: { type: String, default: "" },
            interviewer: { type: String, default: "" },
            contactInfo: { type: String, default: "" },
            outcome: {
                type: String,
                enum: ["pending", "passed", "rejected", "offer"],
                default: "pending",
            },
            reminderSent: { type: Boolean, default: false },
            eventId: { type: String, default: "" },
        },
    ],

    // analytics helpers
    responseReceived: { type: Boolean, default: false },
    offerDate: { type: Date, default: null },
    stageDurations: { type: Map, of: Number, default: {} },

}, { timestamps: true });

// Compound index for efficient status queries
JobSchema.index({ userId: 1, status: 1 });

// Middleware to automatically add to statusHistory when status changes
JobSchema.pre('save', function (next) {
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

// Automatically calculate autoArchiveDate if missing
JobSchema.pre('save', function (next) {
    if (!this.autoArchiveDate && this.createdAt && this.autoArchiveDays) {
        this.autoArchiveDate = new Date(
            new Date(this.createdAt).getTime() + this.autoArchiveDays * 24 * 60 * 60 * 1000
        );
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