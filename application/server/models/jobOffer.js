import mongoose from "mongoose";

const RatingsSchema = new mongoose.Schema(
  {
    cultureFit: { type: Number, default: 3 },          // 1..5
    growthOpportunities: { type: Number, default: 3 }, // 1..5
    workLifeBalance: { type: Number, default: 3 },     // 1..5
  },
  { _id: false }
);

const BenefitsSchema = new mongoose.Schema(
  {
    employerHealthMonthly: { type: Number, default: 0 }, // employer share estimate
    matchPercent: { type: Number, default: 0 },          // e.g., 0.04 for 4%
    matchCapPercent: { type: Number, default: 0 },       // e.g., 0.04 for "match up to 4%"
    ptoDays: { type: Number, default: 0 },               // annual PTO days
    otherAnnual: { type: Number, default: 0 },           // misc annual benefit value estimate
  },
  { _id: false }
);

const JobOfferSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    company: { type: String, required: true },
    title: { type: String, required: true },

    location: {
      raw: { type: String, default: "" }, // e.g., "New York, NY"
      colIndex: { type: Number, default: 100 }, // 100 = baseline, >100 = more expensive
    },

    remotePolicy: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "unknown"],
      default: "unknown",
    },

    // Financial inputs
    comp: {
      baseSalary: { type: Number, required: true }, // annual
      annualBonusTarget: { type: Number, default: 0 },
      signOnBonus: { type: Number, default: 0 },
      equityTotalValue: { type: Number, default: 0 }, // user's estimate
      equityVestingYears: { type: Number, default: 4 },
    },

    benefits: { type: BenefitsSchema, default: () => ({}) },
    ratings: { type: RatingsSchema, default: () => ({}) },

    notes: { type: String, default: "" },

    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    archiveReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.JobOffer || mongoose.model("JobOffer", JobOfferSchema);
