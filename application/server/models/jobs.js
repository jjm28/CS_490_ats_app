import mongoose from "mongoose";

const { Schema } = mongoose;

// ✅ Contact Schema for structured recruiter/hiring manager info
const ContactSchema = new Schema(
  {
    name: { type: String, default: "", maxlength: 150 },
    email: { type: String, default: "", maxlength: 150, lowercase: true, trim: true },
    phone: { type: String, default: "", maxlength: 20 },
    linkedIn: { type: String, default: "", maxlength: 200 },
    notes: { type: String, default: "", maxlength: 500 },
  },
  { _id: false }
);

// ✅ Application history schema
const ApplicationHistorySchema = new Schema(
  {
    action: { type: String, required: true, maxlength: 200 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ✅ Status history schema
const StatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "interested",
        "applied",
        "phone_screen",
        "interview",
        "offer",
        "rejected",
      ],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500 },
  },
  { _id: false }
);

// ✅ Main Job Schema
const JobSchema = new Schema(
  {
    userId: { type: String, ref: "User", required: true, index: true },

    // Basic job info
    jobTitle: { type: String, required: true, maxlength: 150 },
    company: { type: String, required: true, maxlength: 150 },
    location: { type: String, default: "", maxlength: 150 },
    industry: { type: String, index: true },
    type: { type: String, index: true },
    salaryMin: { type: Schema.Types.Decimal128 },
    salaryMax: { type: Schema.Types.Decimal128 },
    jobPostingUrl: { type: String, default: "" },
    applicationDeadline: { type: Date },
    description: { type: String, default: "", maxlength: 2000 },

    // ✅ Archiving & analytics fields
    archived: { type: Boolean, default: false },
    archiveReason: { type: String, maxlength: 200, default: null },
    archivedAt: { type: Date, default: null },
    autoArchiveDays: {
      type: Number,
      min: 1,
      set: (v) =>
        v !== undefined && v !== null && v !== "" ? Number(v) : 60,
      default: 60,
    },
    responseReceived: { type: Boolean, default: false },
    offerDate: { type: Date, default: null },
    stageDurations: { type: Map, of: Number, default: {} },

    // ✅ Status tracking
    status: {
      type: String,
      enum: [
        "interested",
        "applied",
        "phone_screen",
        "interview",
        "offer",
        "rejected",
      ],
      default: "interested",
      index: true,
    },
    statusHistory: [StatusHistorySchema],

    // ✅ Structured contact info
    recruiter: ContactSchema,
    hiringManager: ContactSchema,
    additionalContacts: [ContactSchema],

    // ✅ Notes
    notes: { type: String, default: "" },
    salaryNotes: { type: String, default: "" },
    interviewNotes: { type: String, default: "" },

    // ✅ Application history
    applicationHistory: [ApplicationHistorySchema],
  },
  { timestamps: true }
);

// ✅ Compound indexes for performance
JobSchema.index({ userId: 1, status: 1 });
JobSchema.index({ jobTitle: "text", industry: "text", type: "text" });

// ✅ Middleware to add status change automatically
JobSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const lastHistory = this.statusHistory[this.statusHistory.length - 1];
    if (!lastHistory || lastHistory.status !== this.status) {
      this.statusHistory.push({
        status: this.status,
        changedAt: new Date(),
      });
    }
  }
  next();
});

// ✅ User Preferences Schema for saved searches
const SavedSearchSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    searchQuery: { type: String, default: "" },
    statusFilter: { type: String, default: "All" },
    industryFilter: { type: String, default: "All" },
    locationFilter: { type: String, default: "" },
    salaryMinFilter: { type: String, default: "" },
    salaryMaxFilter: { type: String, default: "" },
    deadlineStartFilter: { type: String, default: "" },
    deadlineEndFilter: { type: String, default: "" },
    sortBy: {
      type: String,
      enum: ["dateAdded", "deadline", "salary", "company"],
      default: "dateAdded",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const UserPreferencesSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    savedSearches: [SavedSearchSchema],
    lastSearch: {
      searchQuery: { type: String, default: "" },
      statusFilter: { type: String, default: "All" },
      industryFilter: { type: String, default: "All" },
      locationFilter: { type: String, default: "" },
      salaryMinFilter: { type: String, default: "" },
      salaryMaxFilter: { type: String, default: "" },
      deadlineStartFilter: { type: String, default: "" },
      deadlineEndFilter: { type: String, default: "" },
      sortBy: {
        type: String,
        enum: ["dateAdded", "deadline", "salary", "company"],
        default: "dateAdded",
      },
    },
  },
  { timestamps: true }
);

// ✅ Model exports
const Jobs = mongoose.models.Jobs || mongoose.model("Jobs", JobSchema);
const UserPreferences =
  mongoose.models.UserPreferences ||
  mongoose.model("UserPreferences", UserPreferencesSchema);

export default Jobs;
export { UserPreferences };