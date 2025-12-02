import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // string id reference to User
    type: {
      type: String,
      enum: ["thumbs_up", "celebrate", "fire"],
      required: true,
    },
  },
  { _id: false }
);

const JobSharingDiscussionMessageSchema = new mongoose.Schema(
  {
    // whose job search this discussion belongs to
    ownerUserId: { type: String, required: true, index: true },

    // who posted the message
    senderUserId: { type: String, required: true, index: true },

    text: { type: String, required: true },

    // optional context link: goal, milestone, report, or generic
    contextType: {
      type: String,
      enum: ["goal", "milestone", "report", "general"],
      default: "general",
    },
    contextId: { type: String },

    reactions: [ReactionSchema],
  },
  { timestamps: true }
);

const JobSharingDiscussionMessage = mongoose.model(
  "JobSharingDiscussionMessage",
  JobSharingDiscussionMessageSchema
);

export default JobSharingDiscussionMessage;
