import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfileOptimization,
  type ProfileOptimizationSuggestion,
} from "../../../api/linkedin";
import { TrendingUp, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function ProfileOptimization() {
  const [suggestions, setSuggestions] = useState<ProfileOptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const navigate = useNavigate();

  async function handleAnalyze() {
    try {
      setLoading(true);
      const data = await getProfileOptimization();
      setSuggestions(data);
      setAnalyzed(true);
    } catch (err) {
      console.error("Failed to analyze profile:", err);
      alert("Failed to analyze profile");
    } finally {
      setLoading(false);
    }
  }

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };

  const priorityIcons = {
    high: <AlertCircle className="w-5 h-5 text-red-600" />,
    medium: <Clock className="w-5 h-5 text-yellow-600" />,
    low: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

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
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Profile Optimization
        </h1>
        <p className="text-gray-600 mt-2">
          AI-powered suggestions to strengthen your LinkedIn profile
        </p>
      </div>

      {!analyzed ? (
        <div className="text-center py-20">
          <TrendingUp className="w-16 h-16 text-blue-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Ready to optimize your profile?
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Our AI will analyze your LinkedIn profile and provide personalized
            suggestions to help you stand out.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                       rounded-lg shadow-lg hover:opacity-90 transition font-semibold
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Analyze My Profile"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analysis Complete
            </h3>
            <p className="text-gray-700">
              Found {suggestions.length} optimization opportunities. Focus on high-priority
              items first for maximum impact.
            </p>
          </div>

          {/* Suggestions by Priority */}
          {["high", "medium", "low"].map((priority) => {
            const filtered = suggestions.filter((s) => s.priority === priority);
            if (filtered.length === 0) return null;

            return (
              <div key={priority}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize">
                  {priority} Priority ({filtered.length})
                </h3>
                <div className="space-y-3">
                  {filtered.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-xl border-2 ${
                        priorityColors[suggestion.priority]
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {priorityIcons[suggestion.priority]}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 capitalize">
                              {suggestion.category.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-gray-700">{suggestion.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Re-analyze Button */}
          <div className="pt-6 text-center">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Re-analyzing..." : "Re-analyze Profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}