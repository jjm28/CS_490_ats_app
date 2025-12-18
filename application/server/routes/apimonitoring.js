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

/**
 * Get API tier and account info
 * @param {string} apiName - Name of the API
 * @returns {Object} - { tier: 'free' | 'paid', accountCount: number }
 */
function getApiTierInfo(apiName) {
  const tierInfo = {
    // AI APIs
    'gemini': { tier: 'free', accountCount: 3 },       // 3 free accounts
    'openai': { tier: 'free', accountCount: 3 },       // 3 free accounts
    
    // Search & News APIs
    'google-search': { tier: 'paid', accountCount: 1 }, // Paid tier (100/day is paid)
    'newsapi': { tier: 'free', accountCount: 1 },       // Free tier
    
    // OAuth APIs (free)
    'github': { tier: 'free', accountCount: 1 },
    'google': { tier: 'free', accountCount: 1 },
    'microsoft': { tier: 'free', accountCount: 1 },
    'linkedin': { tier: 'free', accountCount: 1 },
    
    // Job Board APIs (free)
    'adzuna': { tier: 'free', accountCount: 1 },
    'careeronestop': { tier: 'free', accountCount: 1 },
  };
  
  return tierInfo[apiName] || { tier: 'free', accountCount: 1 };
}

/**
 * Get quota limits for different APIs (with multi-account multipliers)
 * @param {string} apiName - Name of the API
 * @returns {number} - Total daily/monthly quota limit
 */
function getApiLimit(apiName) {
  const { accountCount } = getApiTierInfo(apiName);
  
  const baseLimits = {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AI APIs (multiplied by account count)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'gemini': 1500,           // FREE: 1500 RPD per account
                              // 3 accounts = 4500 total
    
    'openai': 200,            // FREE: ~200 RPD per account (estimated)
                              // 3 accounts = 600 total
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Search & News APIs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'google-search': 10000,     // PAID: 100 queries per day
                              // (First 100 free, then $5/1000)
    
    'newsapi': 100,           // FREE: 100 requests per day
                              // Articles delayed 24h on free tier
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OAuth APIs (per hour, converted to daily estimate)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'github': 5000,           // FREE: 5000 per hour (authenticated)
    'google': 10000,          // FREE: ~10000 per day
    'microsoft': 10000,       // FREE: ~10000 per day
    'linkedin': 500,          // FREE: ~500 per day (restrictive)
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Job Board APIs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'adzuna': 5000,           // FREE: Check your plan
    'careeronestop': 10000,   // FREE: US Dept of Labor
  };
  
  const baseLimit = baseLimits[apiName] || 1000;
  
  // Multiply by account count for APIs with multiple accounts
  return baseLimit * accountCount;
}

// Get API usage statistics
router.get('/api-stats', async (req, res) => {
  try {
    const quotas = await ApiQuota.find();

    const stats = await Promise.all(
      quotas.map(async (quota) => {
        const limit = getApiLimit(quota.apiName);
        const { tier, accountCount } = getApiTierInfo(quota.apiName);

        const [
          totalCalls,
          callsToday,
          errorsToday,
          lastCall,
          avgResponseTime
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
            .select('timestamp'),
          ApiCall.aggregate([
            {
              $match: {
                apiName: quota.apiName,
                responseTimeMs: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$responseTimeMs" }
              }
            }
          ])
        ]);

        return {
          apiName: quota.apiName,
          currentUsage: totalCalls,
          quotaLimit: limit,
          totalCalls,
          callsToday,
          errorsToday,
          lastCalledAt: lastCall?.timestamp || null,
          avgResponseTime: avgResponseTime[0]?.avg || 0,
          tier,              // NEW: 'free' or 'paid'
          accountCount       // NEW: number of accounts
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
      .limit(20)
      .select('apiName timestamp errorMessage statusCode');
    
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
              currentUsage: q.currentUsage,
              quotaLimit: limit,
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
                responseTimeMs: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$responseTimeMs" }
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

export default router;