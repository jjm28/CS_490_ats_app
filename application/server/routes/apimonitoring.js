// routes/admin.js
import express from 'express';
import ApiCall from '../models/apicall.js';
import ApiQuota from '../models/apicall.js';

const router = express.Router();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};


// Get API usage statistics
router.get('/api-stats', async (req, res) => {
  try {
    const quotas = await ApiQuota.find();

    const stats = await Promise.all(
      quotas.map(async (quota) => {
        const limit = getApiLimit(quota.apiName);

        const [
          totalCalls,
          callsToday,
          errorsToday,
          lastCall
        ] = await Promise.all([
          ApiCall.countDocuments({ apiName: quota.apiName }),
          ApiCall.countDocuments({
            apiName: quota.apiName,
            timestamp: { $gte: startOfToday() }
          }),
          ApiCall.countDocuments({
            apiName: quota.apiName,
            success: false,
            timestamp: { $gte: startOfToday() }
          }),
          ApiCall.findOne({ apiName: quota.apiName })
            .sort({ timestamp: -1 })
            .select('timestamp')
        ]);

        return {
          apiName: quota.apiName,
          currentUsage: totalCalls,   // ← use the count you just calculated
          quotaLimit: limit,
          totalCalls,
          callsToday,
          errorsToday,
          lastCalledAt: lastCall?.timestamp || null
        };
      })
    );

    res.json(stats);
  } catch (error) {
    console.error(error);
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
      .map(q => {
        const limit = getApiLimit(q.apiName);
        const percentUsed = (q.currentUsage / limit) * 100;

        return percentUsed > 80
          ? {
              apiName: q.apiName,
              percentUsed: percentUsed.toFixed(1)
            }
          : null;
      })
      .filter(Boolean);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly API usage reports
router.get('/api-weekly-reports', async (req, res) => {
  try {
    const quotas = await ApiQuota.find();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const reports = await Promise.all(
      quotas.map(async (quota) => {
        const [weeklyCalls, weeklyErrors, avgResponseTime] = await Promise.all([
          ApiCall.countDocuments({
            apiName: quota.apiName,
            timestamp: { $gte: oneWeekAgo }
          }),
          ApiCall.countDocuments({
            apiName: quota.apiName,
            success: false,
            timestamp: { $gte: oneWeekAgo }
          }),
          ApiCall.aggregate([
            {
              $match: {
                apiName: quota.apiName,
                timestamp: { $gte: oneWeekAgo },
                responseTime: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$responseTime" }
              }
            }
          ])
        ]);

        return {
          apiName: quota.apiName,
          weeklyCalls,
          weeklyErrors,
          avgResponseTime: avgResponseTime[0]?.avg?.toFixed(2) || null
        };
      })
    );

    res.json(reports);
  } catch (error) {
    console.error(error);
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
    'google-search': 10000
  };
  return limits[apiName] || 1000;
}

export default router;