// src/pages/ApiMonitoring.tsx
import { useEffect, useState } from 'react';

interface ApiStat {
  apiName: string;
  currentUsage: number;
  quotaLimit: number;
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

export default function ApiMonitoring() {
  const [stats, setStats] = useState<ApiStat[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, errorsRes, alertsRes] = await Promise.all([
        fetch('http://localhost:5050/api/admin/api-stats'),
        fetch('http://localhost:5050/api/admin/api-errors'),
        fetch('http://localhost:5050/api/admin/api-alerts')
      ]);

      setStats(await statsRes.json());
      setErrors(await errorsRes.json());
      setAlerts(await alertsRes.json());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">API Monitoring Dashboard</h1>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <ApiUsageCard key={stat.apiName} {...stat} />
          ))}
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

function ApiUsageCard({ apiName, currentUsage, quotaLimit }: ApiStat) {
  const percentUsed = (currentUsage / quotaLimit) * 100;
  const isWarning = percentUsed > 80;

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isWarning ? 'border-l-4 border-yellow-400' : ''}`}>
      <h3 className="text-lg font-semibold mb-2">{apiName}</h3>
      <p className="text-3xl font-bold text-gray-900">{currentUsage}/{quotaLimit}</p>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
        <div 
          className={`h-2 rounded-full ${isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2">{percentUsed.toFixed(1)}% used</p>
    </div>
  );
}