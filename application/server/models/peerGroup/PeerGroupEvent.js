// models/PeerGroupEvent.js
import mongoose from "mongoose";

const PeerGroupEventSchema = new mongoose.Schema(
  {
    // store group._id as string
    groupId: {
      type: String,
      required: true,
      index: true,
    },

    // user._id as string
    createdBy: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    // coaching vs webinar vs others
    type: {
      type: String,
      enum: ["group_coaching", "webinar", "office_hours", "other"],
      default: "group_coaching",
    },

    // times are ISO strings / Date in Mongo, but we treat them as Date here
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    // location & link
    locationType: {
      type: String,
      enum: ["online", "in_person"],
      default: "online",
    },
    locationText: { type: String, default: "" }, // e.g. "Zoom", "Discord", "Room 204"
    joinUrl: { type: String, default: "" },      // Zoom/Meet/Discord link

    maxAttendees: { type: Number, default: 0 },   // 0 = no limit

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

const PeerGroupEvent = mongoose.model("PeerGroupEvents", PeerGroupEventSchema);
export default PeerGroupEvent;
