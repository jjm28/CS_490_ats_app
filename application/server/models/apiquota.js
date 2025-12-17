const mongoose = require('mongoose');

const apiQuotaSchema = new mongoose.Schema({
  apiName: { type: String, required: true, unique: true },
  currentUsage: { type: Number, default: 0 },
  quotaLimit: Number,
  resetDate: Date,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiQuota', apiQuotaSchema);