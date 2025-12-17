// routes/admin.js
import express from 'express';
import ApiCall from '../models/apicall.js';
import ApiQuota from '../models/apicall.js';

const router = express.Router();

// Get API usage statistics
router.get('/api-stats', async (req, res) => {
  try {
    const quotas = await ApiQuota.find();
    
    const statsWithLimits = quotas.map(quota => ({
      ...quota.toObject(),
      quotaLimit: getApiLimit(quota.apiName)
    }));
    
    res.json(statsWithLimits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent errors
router.get('/api-errors', async (req, res) => {
  try {
    const errors = await ApiCall.find({ success: false })
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get rate limit alerts
router.get('/api-alerts', async (req, res) => {
  try {
    const quotas = await ApiQuota.find();
    
    const alerts = quotas
      .filter(q => {
        const limit = getApiLimit(q.apiName);
        const usage = (q.currentUsage / limit) * 100;
        return usage > 80;
      })
      .map(q => ({
        apiName: q.apiName,
        currentUsage: q.currentUsage,
        quotaLimit: getApiLimit(q.apiName),
        percentUsed: ((q.currentUsage / getApiLimit(q.apiName)) * 100).toFixed(1)
      }));
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getApiLimit(apiName) {
  const limits = {
    'openai': 10000,
    'gemini': 60,
    'github': 5000,
    'newsapi': 1000,
    'adzuna': 5000,
    'careeronestop': 10000,
    'google-search': 100
  };
  return limits[apiName] || 1000;
}

export default router;