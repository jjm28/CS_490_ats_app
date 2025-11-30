// models/PeerGroup.js
import mongoose from "mongoose";
import { string } from "zod";

const PeerGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },

    // high-level categorization
    industry: { type: String, index: true }, // e.g. "Technology", "Finance"
    role: { type: String, index: true },     // e.g. "Software Engineer", "Data Analyst"

    tags: [{ type: String }],                // e.g. ["Intern 2026", "New Grad 2025"]

    isPrivate: { type: Boolean, default: false },

    createdBy: { type: String, ref: "User" },

    memberCount: { type: Number, default: 0 },

    // future-proofing for anonymity settings etc.
    allowAnonymousPosts: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PeerGroup = mongoose.model("PeerGroups", PeerGroupSchema);
export default PeerGroup
