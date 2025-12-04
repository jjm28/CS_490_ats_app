// application/server/models/teamMembership.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * TeamMembership
 *
 * We keep:
 *  - teamId: ObjectId of the Team document
 *  - userId: string UUID / user ID
 *  - invitedEmail: email used for the invite (optional in dev)
 *  - roles: ["admin", "mentor", "candidate"]
 *  - status: "invited" | "active" | "removed"
 *  - invitedBy: string UUID of the inviter
 */
const TeamMembershipSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    // Your user IDs are UUID/string, not ObjectIds
    userId: {
      type: String,
      required: false,
      index: true,
    },

    // Email the invite was sent to
    invitedEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },

    roles: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["invited", "active", "removed"],
      default: "invited",
      index: true,
    },

    invitedBy: {
      type: String, // userId of inviter
      required: false,
    },

    invitedAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // Make sure Mongoose uses the same collection as the raw driver
    collection: "teamMemberships",
  }
);

export default mongoose.model("TeamMembership", TeamMembershipSchema);
