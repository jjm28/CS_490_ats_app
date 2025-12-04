import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getContentStrategy, type ContentStrategy } from "../../../api/linkedin";
import { FileText, TrendingUp, Calendar, Target } from "lucide-react";

export default function ContentStrategyPage() {
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleGenerate() {
    try {
      setLoading(true);
      const data = await getContentStrategy();
      setStrategy(data);
    } catch (err) {
      console.error("Failed to generate strategy:", err);
      alert("Failed to generate strategy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking/linkedin")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-gradient-to-r from-[#0A66C2] to-[#004182] 
                   rounded-lg shadow hover:opacity-90 transition"
      >
        ← Back to LinkedIn Tools
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="w-8 h-8 text-orange-600" />
          Content Strategy
        </h1>
        <p className="text-gray-600 mt-2">
          Learn what to post and when for maximum engagement
        </p>
      </div>

      {!strategy ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-orange-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Build Your Content Strategy
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Get personalized recommendations on what to post, when to post, and how
            to engage your network effectively.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white 
                       rounded-lg shadow-lg hover:opacity-90 transition font-semibold
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Strategy"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Content Type */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Content Focus</h3>
            </div>
            <p className="text-gray-700">{strategy.contentType}</p>
          </div>

          {/* Frequency */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Posting Frequency
              </h3>
            </div>
            <p className="text-gray-700">{strategy.frequency}</p>
          </div>

          {/* Topics */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Recommended Topics
              </h3>
            </div>
            <ul className="space-y-2">
              {strategy.topics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pro Tips for Maximum Engagement
            </h3>
            <ul className="space-y-3">
              {strategy.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-orange-600 font-bold mt-0.5">{idx + 1}.</span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Regenerate Button */}
          <div className="text-center pt-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 
                         transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Regenerating..." : "Regenerate Strategy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}