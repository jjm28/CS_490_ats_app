import { useEffect, useState } from 'react';

interface ApiStat {
  apiName: string;
  currentUsage: number;
  quotaLimit: number;
  totalCalls: number;
  callsToday: number;
  errorsToday: number;
  lastCalledAt: string | null;
  avgResponseTime: number;
  tier: string; // NEW: 'free' or 'paid'
  accountCount: number; // NEW: number of accounts
}

interface ApiError {
  apiName: string;
  timestamp: string;
  errorMessage: string;
  statusCode: number;
}

interface Alert {
  apiName: string;
  percentUsed: string;
}

interface WeeklyReport {
  apiName: string;
  weeklyCalls: number;
  weeklyErrors: number;
  avgResponseTime: number;
}

export default function ApiMonitoring() {
  const [stats, setStats] = useState<ApiStat[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, errorsRes, alertsRes, reportsRes] = await Promise.all([
        fetch('http://localhost:5050/apiMonitor/api-stats'),
        fetch('http://localhost:5050/apiMonitor/api-errors'),
        fetch('http://localhost:5050/apiMonitor/api-alerts'),
        fetch('http://localhost:5050/apiMonitor/api-weekly-reports')
      ]);

      if (!statsRes.ok || !errorsRes.ok || !alertsRes.ok || !reportsRes.ok) {
        setApiUnavailable(true);
        throw new Error('One or more requests failed');
      }

      setStats(await statsRes.json());
      setErrors(await errorsRes.json());
      setAlerts(await alertsRes.json());
      setReports(await reportsRes.json());
      setApiUnavailable(false);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      setApiUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  const groupedStats = Object.values(
    stats.reduce((acc, stat) => {
      if (!acc[stat.apiName]) {
        acc[stat.apiName] = { ...stat };
      } else {
        acc[stat.apiName].currentUsage += stat.currentUsage;
        acc[stat.apiName].totalCalls += stat.totalCalls;
        acc[stat.apiName].callsToday += stat.callsToday;
        acc[stat.apiName].errorsToday += stat.errorsToday;

        const currentLast = acc[stat.apiName].lastCalledAt;
        const newLast = stat.lastCalledAt;
        if (newLast && (!currentLast || new Date(newLast) > new Date(currentLast))) {
          acc[stat.apiName].lastCalledAt = newLast;
        }

        acc[stat.apiName].avgResponseTime = (
          (acc[stat.apiName].avgResponseTime + stat.avgResponseTime) / 2
        );
      }
      return acc;
    }, {} as Record<string, ApiStat>)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading API monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">API Monitoring Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring of all external API usage and performance</p>
      </div>

      {/* API Unavailable Warning */}
      {apiUnavailable && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <h2 className="text-lg font-semibold text-red-800">API Monitoring Unavailable</h2>
              <p className="text-red-700">Some monitoring services are currently unavailable. Please try again later.</p>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">Rate Limit Alerts</h2>
              {alerts.map((alert, i) => (
                <p key={i} className="text-yellow-700 font-medium">
                  <span className="font-bold">{alert.apiName}</span> is at {alert.percentUsed}% of quota
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Usage Stats */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">📊 API Usage Statistics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupedStats.map((stat) => (
            <ApiUsageCard key={stat.apiName} {...stat} />
          ))}
        </div>
      </section>

      {/* Weekly Reports */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">📅 Weekly Reports</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Errors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No weekly data available yet</td>
                </tr>
              ) : (
                reports.map((report, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.apiName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.weeklyCalls.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={report.weeklyErrors > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {report.weeklyErrors}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.avgResponseTime ? `${report.avgResponseTime} ms` : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Errors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">❌ Recent Errors</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Code</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-green-600 font-medium">
                    ✅ No errors in the last 24 hours
                  </td>
                </tr>
              ) : (
                errors.map((error, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {error.apiName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {error.errorMessage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        {error.statusCode}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function getQuotaLabel(apiName: string): string {
  const daily = ['gemini', 'google-search', 'newsapi'];
  const monthly = ['openai', 'github', 'adzuna', 'careeronestop'];
  return daily.includes(apiName) ? 'daily' : monthly.includes(apiName) ? 'monthly' : 'quota';
}

function ApiUsageCard({
  apiName,
  currentUsage,
  quotaLimit,
  totalCalls,
  callsToday,
  errorsToday,
  lastCalledAt,
  avgResponseTime,
  tier,
  accountCount
}: ApiStat) {
  const safeUsage = typeof currentUsage === 'number' && !isNaN(currentUsage) ? currentUsage : 0;
  const safeQuota = typeof quotaLimit === 'number' && !isNaN(quotaLimit) ? quotaLimit : 1000;
  const percentUsed = (safeUsage / safeQuota) * 100;
  const remaining = safeQuota - safeUsage;
  const safeAvgTime = isNaN(avgResponseTime) ? 'N/A' : `${avgResponseTime.toFixed(2)} ms`;
  const isWarning = percentUsed > 80;
  const isCritical = percentUsed > 90;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
      isCritical ? 'border-red-500' : isWarning ? 'border-yellow-500' : 'border-green-500'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-gray-900">{apiName}</h3>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tier === 'free' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {tier === 'free' ? '🆓 FREE TIER' : '💳 PAID'}
          </span>
          {accountCount > 1 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              👥 {accountCount} accounts
            </span>
          )}
        </div>
      </div>

      {/* Usage Summary */}
      <div className="mb-4">
        <p className="text-lg text-gray-700 mb-2">
          <span className="font-bold text-2xl text-gray-900">{safeUsage.toLocaleString()}</span>
          <span className="text-gray-500"> / </span>
          <span className="font-semibold text-gray-700">{safeQuota.toLocaleString()}</span>
          <span className="text-gray-600 text-sm ml-2">{getQuotaLabel(apiName)} calls</span>
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className={`font-semibold ${
            isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {percentUsed.toFixed(1)}% used
          </span>
          <span className="text-gray-600">
            <span className="font-semibold">{remaining.toLocaleString()}</span> remaining
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm pt-4 border-t border-gray-200">
        <div className="flex items-center">
          <span className="mr-2">📈</span>
          <span className="text-gray-600">Total: <strong className="text-gray-900">{totalCalls.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">📅</span>
          <span className="text-gray-600">Today: <strong className="text-gray-900">{callsToday.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">❌</span>
          <span className="text-gray-600">Errors: <strong className={errorsToday > 0 ? 'text-red-600' : 'text-gray-900'}>{errorsToday}</strong></span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">⏱</span>
          <span className="text-gray-600">Avg: <strong className="text-gray-900">{safeAvgTime}</strong></span>
        </div>
        <div className="col-span-2 flex items-center text-xs pt-2 border-t border-gray-100">
          <span className="mr-2">🕒</span>
          <span className="text-gray-500">
            Last called: <strong className="text-gray-700">
              {lastCalledAt ? new Date(lastCalledAt).toLocaleString() : 'Never'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}