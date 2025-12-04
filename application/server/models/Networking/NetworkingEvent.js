import mongoose from "mongoose";

/* ============================================
   FOLLOW-UP SUBSCHEMA
============================================ */
const FollowUpSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

/* ============================================
   EVENT SCHEMA
============================================ */
const NetworkingEventSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  title: { type: String, required: true },
  industry: { type: String },
  location: { type: String },
  roiScore: { type: Number, default: 0 },
  linkedJobIds: {
  type: [String],
  default: []
},



  type: {
    type: String,
    enum: ["virtual", "in-person"],
    default: "in-person",
  },

  date: { type: Date, required: true },

  description: { type: String },

  goals: [{ type: String }],

  attendanceStatus: {
    type: String,
    enum: ["planning", "attended", "missed"],
    default: "planning",
  },

  /* --------------------------------------------
   PRE-EVENT PREPARATION
-------------------------------------------- */
prep: {
  summary: { type: String, default: "" },
  keyPeople: [{ type: String }],
  suggestedQuestions: [{ type: String }],
  prepTasks: [{ type: String }],
  notes: { type: String, default: "" },
  lastGenerated: { type: Date }
},


  /* --------------------------------------------
     FOLLOW-UP TASKS
  -------------------------------------------- */
  followUps: {
    type: [FollowUpSchema],
    default: [],
  },

  /* --------------------------------------------
     🔥 CONNECTIONS MADE AT THIS EVENT
     Stores object IDs from NetworkingConnection
  -------------------------------------------- */
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "NetworkingConnection" }],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("NetworkingEvent", NetworkingEventSchema);
