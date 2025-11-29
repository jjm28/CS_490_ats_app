// models/Company.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  industry: String,
  website: String,
  mission: String,
  values: [String],
  leadership: [
    { name: String, role: String }
  ],
  competitors: [String],
  news: [String],
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model("Company", companySchema);
