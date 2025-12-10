import React, { useEffect, useState } from "react";
import {
  fetchSuccessPatterns,
  fetchSuccessAnalysis,
} from "../../api/successAnalytics";

interface SegmentData {
  segment: string;
  offerRate: number;
  interviewRate?: number;
}

export default function SuccessPatternsDashboard() {
  const [patterns, setPatterns] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [patternsData, analysisData] = await Promise.all([
          fetchSuccessPatterns(),
          fetchSuccessAnalysis(),
        ]);
        setPatterns(patternsData);
        setAnalysis(analysisData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading success pattern data...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!patterns || !analysis)
    return <div className="p-6">No success pattern data found.</div>;

  const { industries, companies, applicationMethods, applicationSources } = patterns;
  const recommendations = analysis?.timingPatterns?.recommendations ?? [];

  const renderList = (title: string, data: SegmentData[]) => (
    <section className="bg-white p-4 rounded shadow">
      <h2 className="font-medium text-lg mb-2">{title}</h2>
      {data.length === 0 ? (
        <p>No data available.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="border px-2 py-1 text-left">Segment</th>
              <th className="border px-2 py-1 text-left">Offer Rate (%)</th>
              {data[0]?.interviewRate !== undefined && (
                <th className="border px-2 py-1 text-left">Interview Rate (%)</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="text-sm">
                <td className="border px-2 py-1">{row.segment}</td>
                <td className="border px-2 py-1">{row.offerRate}</td>
                {row.interviewRate !== undefined && (
                  <td className="border px-2 py-1">{row.interviewRate}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Success Pattern Analysis
      </h1>

      {renderList("By Industry", industries || [])}
      {renderList("By Company", companies || [])}
      {renderList("By Application Method", applicationMethods || [])}
      {renderList("By Source", applicationSources || [])}

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-medium text-lg mb-2">Timing & Strategy Insights</h2>
        {recommendations.length === 0 ? (
          <p>No strategic recommendations yet.</p>
        ) : (
          <ul className="list-disc ml-6 text-gray-700">
            {recommendations.map((rec: string, idx: number) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: rec }} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
