import mongoose from 'mongoose';

const { Schema } = mongoose;

const CoverletterSchema = new Schema(
  {
    // Canonical owner field (match other models)
    owner: { type: String, required: true, index: true },

    // Core resume fields
    filename: { type: String, required: true, maxlength: 200 },
    templateKey: {
      type: String,
      enum: ['formal' ,'creative','technical', 'academic','entry-level' ,'executive' ,'leadership'],
      required: true,
      index: true,
    },
    coverletterdata: { type: Schema.Types.Mixed, required: true }, // flexible JSON blob
    lastSaved: { type: Date },

    // Optional metadata
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public" , "unlisted" , "restricted"],
      default: "restricted",
      index: true,
    },
    restricteduserid:  { type: [String], default: [] },
    allowComments: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Helpful listing/sorting index pattern (like your other models)
CoverletterSchema.index({ userId: 1, updatedAt: -1 });

const Coverletter =
  mongoose.models.Coverletter || mongoose.model('Coverletter', CoverletterSchema, 'coverletters');

export default Coverletter;
