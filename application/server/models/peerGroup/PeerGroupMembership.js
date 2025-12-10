// models/PeerGroupMembership.js
import mongoose from "mongoose";

const PeerGroupMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      index: true,
      required: true,
    },
    groupId: {
      type: String,
      ref: "PeerGroup",
      index: true,
      required: true,
    },

    // member / owner / moderator for future moderation & coaching
    role: {
      type: String,
      enum: ["member", "owner", "moderator"],
      default: "member",
    },

    
    showRealNameInGroup: { type: Boolean, default: true },
    receiveOpportunityAlerts: { type: Boolean, default: true },
    interactionLevel: {
      type: String,
      enum: ["public", "alias", "anonymous"],
      default: "public",
    },
    alias: {
      type: String,
      default: "",
    },
    allowDirectMessages: {
      type: Boolean,
      default: true,
    },
    showProfileLink: {
      type: Boolean,
      default: true,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// avoid duplicates: one membership per user/group
PeerGroupMembershipSchema.index({ userId: 1, groupId: 1 }, { unique: true });

const PeerGroupMembership= mongoose.model("PeerGroupMembership", PeerGroupMembershipSchema);
export default PeerGroupMembership
