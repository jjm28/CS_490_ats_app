// server/models/Contact.js
import mongoose from "mongoose";

const InteractionSchema = new mongoose.Schema({
  interactionId: { type: String, required: true },
  type: { type: String },
  note: { type: String },
  date: { type: Date, default: Date.now },
});

const ContactSchema = new mongoose.Schema(
  {
    userid: { type: String, required: true },
    name: { type: String, required: true },
    jobTitle: { type: String },
    company: { type: String },
    email: { type: String },
    phone: { type: String },

    industry: { type: String },
    relationshipType: { type: String },
    tags: [String],

    relationshipStrength: { type: Number, default: 50 },
    lastInteraction: { type: Date },
    interactions: [InteractionSchema],

    personalNotes: { type: String },
    professionalNotes: { type: String },

    linkedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    reminderDate: { type: Date },

    aiSummary: { type: String },
    aiNextSteps: { type: String },
    aiInterests: { type: String },
  },
  { timestamps: true }
);

// ✅ Use mongoose.models cache so hot-reload doesn’t redefine the model
const Contact =
  mongoose.models.Contact || mongoose.model("Contact", ContactSchema);

export default Contact;
