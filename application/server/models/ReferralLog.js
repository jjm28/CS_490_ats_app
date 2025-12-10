import mongoose from "mongoose";

const ReferralLogSchema = new mongoose.Schema(
  {
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      required: true,
      index: true,
    },

    /*  
      Allowed Events:
      - requested        → Referral request created
      - followup         → Follow-up added
      - gratitude        → Gratitude sent
      - status           → Status updated (completed / declined)
      - metrics          → AI-computed relationship/success score updates
    */
    eventType: {
      type: String,
      required: true,
      enum: ["requested", "followup", "gratitude", "status", "metrics"],
    },

    // Human-readable description for timeline display
    eventDetails: {
      type: String,
      required: true,
    },

    /* 
      Optional extra metadata for logs:  
      - relationshipStrength  
      - successRate  
      - previous & new values for status change  
    */
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("ReferralLog", ReferralLogSchema);
