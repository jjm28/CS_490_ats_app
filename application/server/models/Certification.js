// models/Certification.js
import mongoose from "mongoose";

const CertificationSchema = new mongoose.Schema(
  {
    userId:  { type: String },

    // Existing UC-030 fields
    name: { type: String, required: true },
    organization: { type: String, required: true },
    dateEarned: { type: Date, required: true },
    expirationDate: { type: Date },
    doesNotExpire: { type: Boolean, default: false },
    certificationId: { type: String },
    documentUrl: { type: String },
    verified: { type: Boolean, default: false },
    renewalReminder: { type: String },
    category: { type: String, default: "General" },

    // 🔹 UC-115: Skills & Certifications Showcase fields
    // "formal" = legacy certifications, "badge" = skill badges / showcase entries
    type: {
      type: String,
      enum: ["formal", "badge"],
      default: "formal",
    },

    // Public verification link for this cert / badge
    verificationUrl: { type: String },

    // Badge or screenshot image for the showcase
    badgeImageUrl: { type: String },

    // Human-readable score / achievement (e.g. "Top 5%", "Score 90/100")
    scoreLabel: { type: String },

    // Rich description / notes about the certification or badge
    descriptionRich: { type: String },

    // Should this appear in the Skills & Certifications Showcase section?
    showInShowcase: { type: Boolean, default: true },

    // Category for the showcase ("Coding", "Business", "Design", etc.)
    showcaseCategory: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Certification = mongoose.model(
  "Certification",
  CertificationSchema, 'certifications'
);
