import mongoose from 'mongoose';

const { Schema } = mongoose;
const ReviewerPermission  = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["mentor", "peer", "advisor", "recruiter", "other"],
      required: true,
    },
    canComment: {
      type: Boolean,
      default: true,
    },
    canResolve: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["invited", "viewed", "commented", "completed"],
      default: "invited",
      required: true,
    },
    lastActivityAt: {
      type: Date,
    },
    completedAt: {
      type: Date,},
  },
  { timestamps: true }
);

const CommentSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },

    authorId: { type: String, required: true },   // viewer or owner making the comment
    authorName: { type: String, default: null },
    authorEmail: { type: String, default: null },

    message: { type: String, required: true },

    createdAt: { type: Date, default: Date.now },

    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },

    resolvedBy: { type: String, default: null },
    resolvedByName: { type: String, default: null },
  },
  { _id: false } // IMPORTANT because we already set _id manually inside object
);

const CommentSchema = new mongoose.Schema({
  viewerId: { type: String, required: false },
  text: String,
  createdAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
});

const ResumeSchema = new Schema(
  {
    // Canonical owner field (match other models)
    owner: { type: String, required: true, index: true },

    // Core resume fields
    filename: { type: String, required: true, maxlength: 200 },
    templateKey: {
      type: String,
      enum: ['chronological', 'functional', 'hybrid'],
      required: true,
      index: true,
    },
    resumedata: { type: Schema.Types.Mixed, required: true }, // flexible JSON blob
    lastSaved: { type: Date },

    // Optional metadata
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
    comments: { type: [CommentSchema], default: [] },
        visibility: {
      type: String,
      enum: ["public" , "unlisted" , "restricted"],
      default: "restricted",
      index: true,
    },   
   reviewDeadline: {
      type: Date,
      default: null, // to handle `Date | null`
    },
    reviewers: {
      type: [ReviewerPermission],
      default: [],
    },
    restricteduserid:  { type: [String], default: [] },
    allowComments: { type: Boolean, default: true },
        workflowStatus: {
      type: String,
      enum: ["draft", "in_review", "approved", "changes_requested"],
      default: "draft",
      index: true,
    },
    approvedBy: { type: String, default: null },
    approvedByName: { type: String, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Helpful listing/sorting index pattern (like your other models)
ResumeSchema.index({ userId: 1, updatedAt: -1 });

const Resume =
  mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);



export default Resume;
