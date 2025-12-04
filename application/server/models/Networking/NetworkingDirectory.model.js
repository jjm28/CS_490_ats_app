import mongoose from "mongoose";

const NetworkingDirectorySchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  company: String,
  role: String,
  location: String,
  interests: [String],
  tags: [String],
  linkedinUrl: String,
  source: String // "event", "alumni", "api"
});

export default mongoose.model("NetworkingDirectory", NetworkingDirectorySchema);
