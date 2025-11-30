// models/PeerGroupEventRsvp.js
import mongoose from "mongoose";

const PeerGroupEventRsvpSchema = new mongoose.Schema(
  {
    // event._id as string
    eventId: {
      type: String,
      required: true,
      index: true,
    },

    // user._id as string
    userId: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["going", "interested", "not_going"],
      default: "interested",
    },
  },
  { timestamps: true }
);

// one RSVP per user/event
PeerGroupEventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const PeerGroupEventRsvp = mongoose.model(
  "PeerGroupEventRsvps",
  PeerGroupEventRsvpSchema
);
export default PeerGroupEventRsvp;
