import mongoose from "mongoose";

const NetworkingConnectionSchema = new mongoose.Schema({
  userId: { type: String, required: true },         // UUID string
  eventId: { type: String, required: true },        // Also a UUID/string

  

  name: { type: String, required: true },
  role: { type: String },
  company: { type: String },
  notes: { type: String },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("NetworkingConnection", NetworkingConnectionSchema);
