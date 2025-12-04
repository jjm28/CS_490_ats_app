import React, { useEffect, useState } from "react";
import {
  fetchSuccessOverview,
  fetchSuccessSnapshots,
} from "../../api/successAnalytics";

export default function SuccessOverviewDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewData, snapshotData] = await Promise.all([
          fetchSuccessOverview({ includePredictions: true, snapshot: true }),
          fetchSuccessSnapshots(5),
        ]);
        setOverview(overviewData);
        setSnapshots(snapshotData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-6">Loading success data...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!overview) return <div className="p-6">No data found</div>;

  const { competitive } = overview;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Success Overview</h1>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-medium text-lg mb-2">Key Metrics</h2>
        <ul className="list-disc ml-6 text-gray-700">
          <li>Applications: {competitive?.userMetrics?.applications ?? 0}</li>
          <li>Interviews: {competitive?.userMetrics?.interviews ?? 0}</li>
          <li>Offers: {competitive?.userMetrics?.offers ?? 0}</li>
          <li>
            Interviews per Application:{" "}
            {competitive?.userMetrics?.interviewsPerApplication ?? 0}
          </li>
          <li>
            Offers per Interview:{" "}
            {competitive?.userMetrics?.offersPerInterview ?? 0}
          </li>
        </ul>
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-medium text-lg mb-2">Snapshots</h2>
        {snapshots.length === 0 ? (
          <p>No recent snapshots found.</p>
        ) : (
          <ul className="list-disc ml-6 text-gray-700">
            {snapshots.map((s, i) => (
              <li key={i}>
                {s.dayKey}: {s.payload?.competitive?.userMetrics?.offers ?? 0}{" "}
                offers, {s.payload?.competitive?.userMetrics?.interviews ?? 0}{" "}
                interviews
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
