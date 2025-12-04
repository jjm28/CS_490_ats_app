// models/coverletter.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Subdocument for review comments on a cover letter
 */
const CommentSchema = new Schema(
  {
    viewerId: { type: String, required: false }, // could be userId/email/external id
    text: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
  },
  { _id: true }
);

/**
 * Main Coverletter schema
 * - Supports BOTH "owner" (string) and "userId" (ObjectId) ownership models.
 * - Keeps legacy fields (tags, archived, lastSaved).
 * - Preserves sharing, analytics, and comments features.
 * - Uses a single stored field "coverletterData" with an alias "coverletterdata"
 *   so older code that references either key continues to work.
 */
const CoverletterSchema = new Schema(
  {
    /**
     * Ownership
     * Prefer "owner" (string) to match other models in your app.
     * Keep optional "userId" for compatibility with earlier versions that referenced a User ObjectId.
     */
    owner: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },

    /**
     * Core fields
     */
    filename: { type: String, required: true, maxlength: 200, default: "coverletter" },

    templateKey: {
      type: String,
      enum: ["formal", "creative", "technical", "academic", "entry-level", "executive", "leadership"],
      required: true,
      default: "formal",
      index: true,
    },

    // Canonical storage path is "coverletterData".
    // Provide alias "coverletterdata" so older callers still work.
    coverletterData: { type: Schema.Types.Mixed, required: true, default: {} , alias: "coverletterdata" },

    // Optional manual timestamp you’ve been using in addition to updatedAt
    lastSaved: { type: Date },

    /**
     * Sharing / metadata
     */
    shared: { type: Boolean, default: false },
    shareLink: { type: String, default: "" },

    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },

    /**
     * Analytics
     */
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },

    /**
     * Review comments
     */
    comments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true }
);

/**
 * Indexes
 * - Support both ownership styles for sorting by recency.
 * - Useful filters on archived/template/tags.
 */
CoverletterSchema.index({ owner: 1, updatedAt: -1 });
CoverletterSchema.index({ userId: 1, updatedAt: -1 });
CoverletterSchema.index({ templateKey: 1 });
CoverletterSchema.index({ archived: 1 });
CoverletterSchema.index({ tags: 1 });

/**
 * Hooks
 * - Keep lastSaved in sync when document changes.
 * - Best-effort normalization between owner and userId:
 *   If only userId is provided and owner missing, set owner to stringified userId.
 *   (We do NOT coerce owner → userId because owner may be an email/uuid.)
 */
CoverletterSchema.pre("save", function (next) {
  // Update lastSaved whenever the doc changes
  this.lastSaved = new Date();

  if (!this.owner && this.userId) {
    this.owner = String(this.userId);
  }
  next();
});

/**
 * Model
 * - Explicit collection name 'coverletters' to match your existing usage.
 */
const Coverletter =
  mongoose.models.Coverletter ||
  mongoose.model("Coverletter", CoverletterSchema, "coverletters");

export default Coverletter;
