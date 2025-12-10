import mongoose from "mongoose";
const PeerOpportunitySchema = new mongoose.Schema(
  {
    groupId: {
      type:String,
      ref: "PeerGroup",
      required: true,
      index: true,
    },
    createdBy: {
      type:String,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },        // e.g. SWE Intern
    company: { type: String, required: true },      // e.g. Nvidia
    location: { type: String, default: "" },        // NYC / Remote / etc
    jobUrl: { type: String, default: "" },          // link to posting
    source: { type: String, default: "" },          // e.g. Internal, LinkedIn

    referralAvailable: { type: Boolean, default: false },
    maxReferrals: { type: Number, default: 0 },     // 0 = no explicit cap

    tags: { type: [String], default: [] },          // internship, 2026, backend...
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["open", "filled", "closed", "expired"],
      default: "open",
    },

    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const PeerOpportunity = mongoose.model("PeerOpportunity", PeerOpportunitySchema);
export default PeerOpportunity