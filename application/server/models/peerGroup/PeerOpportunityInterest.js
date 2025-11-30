import mongoose from "mongoose";
import { string } from "zod";

const PeerOpportunityInterestSchema = new mongoose.Schema(
  {
    opportunityId: {
      type: String,
      ref: "PeerOpportunity",
      required: true,
      index: true,
    },
    userId: {
      type:String,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["interested", "profile_sent", "referred", "rejected", "withdrawn"],
      default: "interested",
    },

    note: { type: String, default: "" }, // candidate’s short note for referrer
  },
  { timestamps: true }
);

// one interest per user/opportunity
PeerOpportunityInterestSchema.index(
  { opportunityId: 1, userId: 1 },
  { unique: true }
);

const PeerOpportunityInterest = mongoose.model(
  "PeerOpportunityInterest",
  PeerOpportunityInterestSchema
);
export default PeerOpportunityInterest