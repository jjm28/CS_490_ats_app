import mongoose from 'mongoose';

const { Schema } = mongoose;

const AttendeeSchema = new Schema({
    contactId: {
        type: String, // Contact._id
        required: true
    },
    contactName: {
        type: String,
        required: true
    },
    connectionQuality: {
        type: String,
        enum: ['weak', 'moderate', 'strong', 'very_strong'],
        default: 'moderate'
    },
    followUpStatus: {
        type: String,
        enum: ['not_needed', 'pending', 'completed'],
        default: 'not_needed'
    },
    followUpDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: '',
        maxlength: 500
    }
}, { _id: false });

const NetworkingEventSchema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    
    // Event details
    eventName: {
        type: String,
        required: true,
        maxlength: 200
    },
    eventType: {
        type: String,
        enum: ['conference', 'meetup', 'workshop', 'career_fair', 'networking_event', 'webinar', 'social', 'other'],
        required: true,
        index: true
    },
    eventDate: {
        type: Date,
        required: true,
        index: true
    },
    location: {
        type: String,
        default: '',
        maxlength: 200
    },
    virtualEvent: {
        type: Boolean,
        default: false
    },
    eventUrl: {
        type: String,
        default: '',
        maxlength: 300
    },
    
    // Costs & ROI tracking
    attendanceCost: {
        type: Number,
        default: 0
    },
    travelCost: {
        type: Number,
        default: 0
    },
    otherCosts: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    timeInvested: {
        type: Number, // hours
        default: 0
    },
    
    // Connections made
    attendees: [AttendeeSchema],
    totalConnectionsMade: {
        type: Number,
        default: 0
    },
    qualityConnectionsMade: {
        type: Number, // strong + very_strong
        default: 0
    },
    
    // Outcomes tracked
    jobOpportunitiesGenerated: {
        type: Number,
        default: 0
    },
    jobApplicationsFromEvent: [{
        type: String // Job._id
    }],
    interviewsFromEvent: {
        type: Number,
        default: 0
    },
    offersFromEvent: {
        type: Number,
        default: 0
    },
    
    // Event evaluation
    overallRating: {
        type: Number, // 1-5
        default: null,
        min: 1,
        max: 5
    },
    wouldAttendAgain: {
        type: Boolean,
        default: null
    },
    
    // Notes & learnings
    notes: {
        type: String,
        default: '',
        maxlength: 2000
    },
    keyTakeaways: {
        type: String,
        default: '',
        maxlength: 1000
    },
    
    // Industry/focus
    industry: {
        type: String,
        default: '',
        index: true
    },
    targetRoles: [{
        type: String
    }],
    
    // Calculated metrics (auto-updated)
    roi: {
        type: Number, // (value generated - costs) / costs
        default: null
    },
    roiCalculatedAt: {
        type: Date,
        default: null
    },
    
}, { timestamps: true });

// Indexes for efficient queries
NetworkingEventSchema.index({ userId: 1, eventDate: -1 });
NetworkingEventSchema.index({ userId: 1, eventType: 1 });

// Middleware to calculate totals
NetworkingEventSchema.pre('save', function(next) {
    // Calculate total cost
    this.totalCost = (this.attendanceCost || 0) + (this.travelCost || 0) + (this.otherCosts || 0);
    
    // Calculate total connections
    this.totalConnectionsMade = this.attendees.length;
    
    // Calculate quality connections
    this.qualityConnectionsMade = this.attendees.filter(a => 
        a.connectionQuality === 'strong' || a.connectionQuality === 'very_strong'
    ).length;
    
    next();
});

const NetworkingEvent = mongoose.models.NetworkingEvent || mongoose.model('NetworkingEvent', NetworkingEventSchema);

export default NetworkingEvent;