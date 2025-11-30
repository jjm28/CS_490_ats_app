import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true }, // job seeker
    jobId: { type: String, default: null },                     // optional job

    type: {
      type: String,
      enum: [
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_PASSED",
        "OFFER_RECEIVED",
        "OFFER_ACCEPTED",
        "NEW_JOB_STARTED",
        "CUSTOM_CELEBRATION",
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, default: "" },

    visibility: {
      type: String,
      enum: ["all", "custom"],
      default: "all",
    },

    // If visibility === "custom", only these supporters should see it
    visibleToSupporterIds: [{ type: String, index: true }],

    // snapshot-ish fields – optional, but useful
    jobCompany: { type: String, default: null },
    jobTitle: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Milestone = mongoose.model("Milestone", MilestoneSchema);
export default Milestone;
