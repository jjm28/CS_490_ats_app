// server/models/team.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// Define the schema for Team
const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        roles: {
          type: [String],
          default: ["candidate"],
        },
        status: {
          type: String,
          enum: ["invited", "active", "removed"],
          default: "active",
        },
        invitedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        invitedAt: Date,
        acceptedAt: Date,
      },
    ],
    billing: {
      plan: { type: String, default: "free" },
      status: { type: String, default: "active" },
      createdAt: Date,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);
