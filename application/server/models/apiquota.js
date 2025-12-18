// models/ApiQuota.js
import mongoose from 'mongoose';

const apiQuotaSchema = new mongoose.Schema({
  apiName: { type: String, required: true, unique: true },
  currentUsage: { type: Number, default: 0 },
  quotaLimit: Number,
  resetDate: Date,
  lastUpdated: { type: Date, default: Date.now }
});

const ApiQuota = mongoose.model('ApiQuota', apiQuotaSchema);

export default ApiQuota;
