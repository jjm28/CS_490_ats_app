// src/pages/ApiMonitoring.tsx
import { useEffect, useState } from 'react';

interface ApiStat {
  apiName: string;
  currentUsage: number;
  quotaLimit: number;
  totalCalls: number;
  callsToday: number;
  errorsToday: number;
  lastCalledAt: string | null;
  avgResponseTime: number;   // NEW: track response times
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
  const [apiUnavailable, setApiUnavailable] = useState(false); // NEW: fallback flag

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

      // Use latest timestamp
      const currentLast = acc[stat.apiName].lastCalledAt;
      const newLast = stat.lastCalledAt;
      if (newLast && (!currentLast || new Date(newLast) > new Date(currentLast))) {
        acc[stat.apiName].lastCalledAt = newLast;
      }

      // Average response time across entries
      acc[stat.apiName].avgResponseTime = (
        (acc[stat.apiName].avgResponseTime + stat.avgResponseTime) / 2
      );
    }
    return acc;
  }, {} as Record<string, ApiStat>)
);


  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">API Monitoring Dashboard</h1>

      {/* Fallback message */}
      {apiUnavailable && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">🚨 API Unavailable</h2>
          <p className="text-red-700">Some monitoring services are currently unavailable. Please try again later.</p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Rate Limit Alerts</h2>
          {alerts.map((alert, i) => (
            <p key={i} className="text-yellow-700">
              {alert.apiName} is at {alert.percentUsed}% of quota
            </p>
          ))}
        </div>
      )}

      {/* API Usage Stats */}
      <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">📊 API Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 w-full">
            {groupedStats.map((stat) => (
              <ApiUsageCard key={stat.apiName} {...stat} />
            ))}
          </div>
        </section>

      {/* Weekly Reports */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">📅 Weekly Reports</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekly Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekly Errors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Response Time (ms)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.apiName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.weeklyCalls}</td>
                  <td className="px-6 py-4 text-sm text-red-600">{report.weeklyErrors}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.avgResponseTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Errors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">❌ Recent Errors</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errors.map((error, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {error.apiName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{error.errorMessage}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {error.statusCode}
                  </td>
                </tr>
              ))}
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
  avgResponseTime
}: ApiStat) {
  const safeUsage = typeof currentUsage === 'number' && !isNaN(currentUsage) ? currentUsage : 0;
  const safeQuota = typeof quotaLimit === 'number' && !isNaN(quotaLimit) ? quotaLimit : 1000;
  const percentUsed = (safeUsage / safeQuota) * 100;
  const remaining = safeQuota - safeUsage;
  const safeAvgTime = isNaN(avgResponseTime) ? 'N/A' : `${avgResponseTime.toFixed(2)} ms`;
  const isWarning = percentUsed > 80;

  // Label quota type (daily vs monthly)
  function getQuotaLabel(apiName: string): string {
    const daily = ['gemini', 'google-search', 'newsapi'];
    const monthly = ['openai', 'github', 'adzuna', 'careeronestop'];
    return daily.includes(apiName) ? 'daily' : monthly.includes(apiName) ? 'monthly' : 'quota';
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 space-y-4 ${isWarning ? 'border-l-6 border-yellow-400' : ''}`}>
      <h3 className="text-2xl font-bold text-gray-800">{apiName}</h3>

      {/* Usage line */}
      <p className="text-lg text-gray-700">
        <strong>{safeUsage}</strong> of <strong>{safeQuota}</strong> {getQuotaLabel(apiName)} calls used
      </p>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full ${isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className="text-md text-gray-600">{percentUsed.toFixed(1)}% used — <strong>{remaining}</strong> remaining</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 text-md text-gray-700 pt-4">
        <div>📈 Total Calls: <strong>{totalCalls}</strong></div>
        <div>📅 Calls Today: <strong>{callsToday}</strong></div>
        <div>❌ Errors Today: <strong className="text-red-600">{errorsToday}</strong></div>
        <div>⏱ Avg Response Time: <strong>{safeAvgTime}</strong></div>
        <div className="col-span-2">🕒 Last Called: <strong>{lastCalledAt ? new Date(lastCalledAt).toLocaleString() : 'N/A'}</strong></div>
      </div>
    </div>
  );
}