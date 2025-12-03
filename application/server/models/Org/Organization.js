// models/Org/Organization.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true }, // e.g. "nyu-career"
    logoUrl: { type: String, default: "" },
    primaryColor: { type: String, default: "#000000" },
    secondaryColor: { type: String, default: "#ffffff" },
    // later: custom domain, email settings, etc.
        fixedProgramCost: {
      type: Number,
      default: 0, // base cost per org for the time period
    },
    programCostPerJobSeeker: {
      type: Number,
      default: 0, // average cost per active job seeker
    },

  },
  { timestamps: true }
);

const Organization =
  mongoose.models.Organization ||
  mongoose.model("Organization", OrganizationSchema);

export default Organization;
