// models/Cohort/Cohort.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const CohortSchema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdByUserId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CohortSchema.index({ organizationId: 1, name: 1 });

const Cohort =
  mongoose.models.Cohort || mongoose.model("Cohort", CohortSchema);

export default Cohort;
