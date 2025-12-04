const mongoose = require("mongoose");

const ReferralRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // requester
    contactId: { type: String, required: true }, // who is being asked
    jobId: { type: String, required: true },

    requestMessage: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "sent", "viewed", "accepted", "declined", "completed"],
      default: "pending",
    },

    requestedDate: { type: Date, default: Date.now },

    followUpDate: { type: Date }, // next follow-up time

    lastUpdated: { type: Date, default: Date.now },

    gratitudeSent: { type: Boolean, default: false }, // for thank-you workflow
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReferralRequest", ReferralRequestSchema);
