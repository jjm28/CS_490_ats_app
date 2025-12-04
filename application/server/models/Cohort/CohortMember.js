// models/Cohort/CohortMember.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const CohortMemberSchema = new Schema(
  {
    cohortId: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    jobSeekerUserId: {
      type: String,
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["manual", "import", "integration"],
      default: "manual",
    },
  },
  { timestamps: true }
);

CohortMemberSchema.index(
  { cohortId: 1, jobSeekerUserId: 1 },
  { unique: true }
);

const CohortMember =
  mongoose.models.CohortMember ||
  mongoose.model("CohortMember", CohortMemberSchema);

export default CohortMember;
