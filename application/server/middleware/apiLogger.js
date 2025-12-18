// middleware/apiLogger.js
import ApiCall from '../models/apicall.js';
import ApiQuota from '../models/apiquota.js';

/**
 * Log an API call to the database
 * @param {string} apiName - Name of the API (e.g., 'openai', 'gemini', 'adzuna')
 * @param {string} endpoint - The endpoint called (e.g., '/chat/completions')
 * @param {number} statusCode - HTTP status code (200, 500, etc.)
 * @param {number} responseTimeMs - Response time in milliseconds
 * @param {string|null} error - Error message if call failed
 */
export async function logApiCall(apiName, endpoint, statusCode, responseTimeMs, error = null) {
  try {
    // Log the individual API call
    await ApiCall.create({
      apiName,
      endpoint,
      method: 'POST', // You can make this dynamic if needed
      statusCode,
      responseTimeMs,
      success: statusCode >= 200 && statusCode < 300,
      errorMessage: error,
      timestamp: new Date()
    });

    // Update the quota/usage counter
    await ApiQuota.findOneAndUpdate(
      { apiName },
      { 
        $inc: { currentUsage: 1 },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Logged ${apiName} call: ${statusCode} in ${responseTimeMs}ms`);
    
  } catch (err) {
    // Don't throw - we don't want logging to break the app
    console.error('❌ Failed to log API call:', err.message);
  }
}

/**
 * Wrapper function for making API calls with automatic logging
 * @param {string} apiName - Name of the API
 * @param {string} endpoint - The endpoint being called
 * @param {Function} apiCallFunction - The actual API call function
 * @returns {Promise} - Result of the API call
 */
export async function trackApiCall(apiName, endpoint, apiCallFunction) {
  const startTime = Date.now();
  
  try {
    const result = await apiCallFunction();
    const responseTime = Date.now() - startTime;
    
    await logApiCall(apiName, endpoint, 200, responseTime);
    
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const statusCode = error.status || error.response?.status || 500;
    
    await logApiCall(apiName, endpoint, statusCode, responseTime, error.message);
    
    throw error; // Re-throw so your app can handle it
  }
}

/**
 * Get API usage statistics
 * @returns {Promise<Array>} - Array of API stats with quotas
 */
export async function getApiStats() {
  try {
    const quotas = await ApiQuota.find();
    
    // Add known limits for each API
    const statsWithLimits = quotas.map(quota => ({
      apiName: quota.apiName,
      currentUsage: quota.currentUsage,
      quotaLimit: getApiLimit(quota.apiName),
      lastUpdated: quota.lastUpdated
    }));
    
    return statsWithLimits;
  } catch (error) {
    console.error('Failed to get API stats:', error);
    return [];
  }
}

/**
 * Get recent API errors
 * @param {number} limit - Number of errors to return
 * @returns {Promise<Array>} - Array of recent errors
 */
export async function getRecentErrors(limit = 20) {
  try {
    const errors = await ApiCall.find({ success: false })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('apiName endpoint statusCode errorMessage timestamp');
    
    return errors;
  } catch (error) {
    console.error('Failed to get recent errors:', error);
    return [];
  }
}

/**
 * Get rate limit alerts for APIs nearing their quota
 * @param {number} threshold - Percentage threshold for alerts (default: 80)
 * @returns {Promise<Array>} - Array of alerts
 */
export async function getRateLimitAlerts(threshold = 80) {
  try {
    const quotas = await ApiQuota.find();
    
    const alerts = quotas
      .map(q => {
        const limit = getApiLimit(q.apiName);
        const percentUsed = (q.currentUsage / limit) * 100;
        
        return {
          apiName: q.apiName,
          currentUsage: q.currentUsage,
          quotaLimit: limit,
          percentUsed: percentUsed.toFixed(1),
          isAlert: percentUsed >= threshold
        };
      })
      .filter(alert => alert.isAlert);
    
    return alerts;
  } catch (error) {
    console.error('Failed to get rate limit alerts:', error);
    return [];
  }
}

/**
 * Get quota limits for different APIs
 * @param {string} apiName - Name of the API
 * @returns {number} - Quota limit for the API
 */
function getApiLimit(apiName) {
  const limits = {
    // AI APIs
    'openai': 10000,           // Adjust based on your plan
    'gemini': 1500,            // Free tier: 1500/day
    
    // OAuth APIs
    'github': 5000,            // OAuth requests per hour
    'google': 10000,           // OAuth requests
    'microsoft': 10000,        // OAuth requests
    'linkedin': 500,           // Check LinkedIn's limits
    
    // Job Board APIs
    'adzuna': 5000,            // Check your Adzuna plan
    'careeronestop': 10000,    // US Dept of Labor API
    
    // Other APIs
    'newsapi': 1000,           // Free tier: 1000 requests/day
    'google-search': 100       // Custom search free tier: 100/day
  };
  
  return limits[apiName] || 1000; // Default to 1000 if unknown
}

/**
 * Reset quota counters (useful for daily/monthly resets)
 * @param {string} apiName - Name of the API to reset (or 'all' for all APIs)
 */
export async function resetQuota(apiName = 'all') {
  try {
    if (apiName === 'all') {
      await ApiQuota.updateMany({}, { currentUsage: 0, lastUpdated: new Date() });
      console.log('✅ Reset all API quotas');
    } else {
      await ApiQuota.findOneAndUpdate(
        { apiName },
        { currentUsage: 0, lastUpdated: new Date() }
      );
      console.log(`✅ Reset quota for ${apiName}`);
    }
  } catch (error) {
    console.error('Failed to reset quota:', error);
  }
}

export default {
  logApiCall,
  trackApiCall,
  getApiStats,
  getRecentErrors,
  getRateLimitAlerts,
  resetQuota
};