// server/models/campaign.js
import mongoose from "mongoose";

const OutreachSchema = new mongoose.Schema({
  outreachId: { type: String, required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
  contactName: { type: String }, // Denormalized for quick display
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'responded', 'no-response'],
    default: 'pending'
  },
  approach: { type: String }, // e.g., "LinkedIn message", "Email", "Phone call"
  variantUsed: { type: String }, // Which A/B test variant (if any)
  sentDate: { type: Date },
  responseDate: { type: Date },
  notes: { type: String },
}, { _id: false });

const CampaignGoalsSchema = new mongoose.Schema({
  outreachCount: { type: Number, required: true },
  responseTarget: { type: Number, required: true },
  timeline: { type: Date, required: true },
}, { _id: false });

const CampaignMetricsSchema = new mongoose.Schema({
  totalOutreach: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  responses: { type: Number, default: 0 },
  responseRate: { type: Number, default: 0 },
}, { _id: false });

const ABTestVariantSchema = new mongoose.Schema({
  variantName: { type: String, required: true },
  description: { type: String },
  outreachIds: [String],
  sent: { type: Number, default: 0 },
  responses: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 }
}, { _id: false });

const CampaignSchema = new mongoose.Schema(
  {
    userid: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    targetIndustry: { type: String },
    targetCompanies: [String],
    goals: { type: CampaignGoalsSchema, required: true },
    status: { 
      type: String, 
      enum: ['active', 'paused', 'completed'],
      default: 'active'
    },
    outreaches: [OutreachSchema],
    metrics: { type: CampaignMetricsSchema, default: () => ({}) },
    strategyNotes: { type: String },
    abTestVariants: [ABTestVariantSchema],
    linkedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true }
);

// Indexes for faster queries
CampaignSchema.index({ userid: 1, status: 1 });
CampaignSchema.index({ userid: 1, createdAt: -1 });

const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);

export default Campaign;