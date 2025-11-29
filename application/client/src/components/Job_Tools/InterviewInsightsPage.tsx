import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function InterviewInsightsPage() {
  const { company } = useParams();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/interview-insights/${job._id}`);
        if (!res.ok) throw new Error("Failed to load insights");
        const data = await res.json();
        setInsights(data);
      } catch (e) {
        setError("Unable to load interview insights.");
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [company]);

  if (loading) return <div className="p-6 text-gray-500">Loading insights...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">
        Interview Insights — {company}
      </h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <p className="text-gray-700 whitespace-pre-line">{insights.summary}</p>
        <p className="text-xs text-gray-400 mt-3">
          Last updated: {new Date(insights.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
