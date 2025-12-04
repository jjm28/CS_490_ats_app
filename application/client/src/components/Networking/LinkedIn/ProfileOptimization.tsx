import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfileOptimization,
  type ProfileOptimizationSuggestion,
} from "../../../api/linkedin";
import { TrendingUp, CheckCircle, AlertCircle, Clock, Check, X, Edit2 } from "lucide-react";
import API_BASE from "../../../utils/apiBase";

interface OptimizationData {
  suggestions: (ProfileOptimizationSuggestion & {
    completed?: boolean;
    completedAt?: string;
    notes?: string;
  })[];
  context: {
    currentRole: string;
    yearsOfExperience: string;
    targetRole: string;
    skills: string;
  };
  meta: {
    lastAnalyzedAt: string;
    analysisCount: number;
  };
}

export default function ProfileOptimization() {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [linkedInInfo, setLinkedInInfo] = useState({
    currentRole: "",
    yearsOfExperience: "",
    targetRole: "",
    skills: "",
  });
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");

  // Load saved optimization data on mount
  useEffect(() => {
    loadSavedOptimization();
  }, []);

  async function loadSavedOptimization() {
    try {
      const response = await fetch(`${API_BASE}/api/linkedin/profile/optimize`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizationData(data);
        // Pre-fill form with saved context
        if (data.context) {
          setLinkedInInfo({
            currentRole: data.context.currentRole || "",
            yearsOfExperience: data.context.yearsOfExperience || "",
            targetRole: data.context.targetRole || "",
            skills: data.context.skills || "",
          });
        }
      }
    } catch (err) {
      console.log("No saved optimization data found");
    }
  }

  async function handleAnalyze() {
    if (!showInputForm && !linkedInInfo.currentRole) {
      setShowInputForm(true);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/api/linkedin/profile/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(linkedInInfo),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze profile");
      }

      const data = await response.json();
      setOptimizationData(data);
      setShowInputForm(false);
    } catch (err) {
      console.error("Failed to analyze profile:", err);
      alert("Failed to analyze profile");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSuggestionComplete(index: number, completed: boolean) {
    try {
      const response = await fetch(
        `${API_BASE}/api/linkedin/profile/optimize/suggestion/${index}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed,
            notes: optimizationData?.suggestions[index].notes || "",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update suggestion");

      // Update local state
      setOptimizationData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.suggestions[index] = {
          ...updated.suggestions[index],
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
        return updated;
      });
    } catch (err) {
      console.error("Failed to toggle suggestion:", err);
      alert("Failed to update suggestion");
    }
  }

  async function saveNote(index: number) {
    try {
      const response = await fetch(
        `${API_BASE}/api/linkedin/profile/optimize/suggestion/${index}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: optimizationData?.suggestions[index].completed || false,
            notes: noteText,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save note");

      // Update local state
      setOptimizationData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.suggestions[index] = {
          ...updated.suggestions[index],
          notes: noteText,
        };
        return updated;
      });

      setEditingNoteIndex(null);
      setNoteText("");
    } catch (err) {
      console.error("Failed to save note:", err);
      alert("Failed to save note");
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

  // Calculate progress
  const completedCount = optimizationData?.suggestions.filter(s => s.completed).length || 0;
  const totalCount = optimizationData?.suggestions.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

      {!optimizationData ? (
        <>
          {!showInputForm ? (
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-blue-300 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Ready to optimize your LinkedIn profile?
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
            <div className="max-w-2xl mx-auto">
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tell us about your LinkedIn profile
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Provide some details to get personalized optimization suggestions.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Role / Headline *
                    </label>
                    <input
                      type="text"
                      value={linkedInInfo.currentRole}
                      onChange={(e) =>
                        setLinkedInInfo({ ...linkedInInfo, currentRole: e.target.value })
                      }
                      placeholder="e.g. Senior Software Engineer at Google"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="text"
                      value={linkedInInfo.yearsOfExperience}
                      onChange={(e) =>
                        setLinkedInInfo({ ...linkedInInfo, yearsOfExperience: e.target.value })
                      }
                      placeholder="e.g. 5 years"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Role (Optional)
                    </label>
                    <input
                      type="text"
                      value={linkedInInfo.targetRole}
                      onChange={(e) =>
                        setLinkedInInfo({ ...linkedInInfo, targetRole: e.target.value })
                      }
                      placeholder="e.g. Engineering Manager"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Skills (Optional)
                    </label>
                    <textarea
                      value={linkedInInfo.skills}
                      onChange={(e) =>
                        setLinkedInInfo({ ...linkedInInfo, skills: e.target.value })
                      }
                      placeholder="e.g. React, Node.js, AWS, Team Leadership"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInputForm(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !linkedInInfo.currentRole}
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                               transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Analyzing..." : "Get Suggestions"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your LinkedIn Profile Analysis
                </h3>
                <p className="text-sm text-gray-600">
                  Last analyzed: {new Date(optimizationData.meta.lastAnalyzedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Total analyses: {optimizationData.meta.analysisCount}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInputForm(true);
                  setOptimizationData(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Re-analyze
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress: {completedCount} of {totalCount} completed
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Suggestions Checklist */}
          {["high", "medium", "low"].map((priority) => {
            const filtered = optimizationData.suggestions.filter(
              (s) => s.priority === priority
            );
            if (filtered.length === 0) return null;

            return (
              <div key={priority}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize flex items-center gap-2">
                  {priorityIcons[priority as keyof typeof priorityIcons]}
                  {priority} Priority ({filtered.filter(s => s.completed).length}/{filtered.length} completed)
                </h3>
                <div className="space-y-3">
                  {filtered.map((suggestion, idx) => {
                    const globalIndex = optimizationData.suggestions.indexOf(suggestion);
                    return (
                      <div
                        key={globalIndex}
                        className={`p-5 rounded-xl border-2 transition-all ${
                          suggestion.completed
                            ? "bg-green-50 border-green-200"
                            : priorityColors[suggestion.priority]
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() =>
                              toggleSuggestionComplete(globalIndex, !suggestion.completed)
                            }
                            className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              suggestion.completed
                                ? "bg-green-600 border-green-600"
                                : "border-gray-300 hover:border-green-500"
                            }`}
                          >
                            {suggestion.completed && <Check className="w-4 h-4 text-white" />}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 capitalize">
                                {suggestion.category.replace(/_/g, " ")}
                              </span>
                              {suggestion.completed && suggestion.completedAt && (
                                <span className="text-xs text-green-600">
                                  ✓ Completed {new Date(suggestion.completedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className={`text-gray-700 ${suggestion.completed ? "line-through opacity-70" : ""}`}>
                              {suggestion.suggestion}
                            </p>

                            {/* Notes Section */}
                            {editingNoteIndex === globalIndex ? (
                              <div className="mt-3">
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Add implementation notes..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => saveNote(globalIndex)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingNoteIndex(null);
                                      setNoteText("");
                                    }}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {suggestion.notes && (
                                  <div className="mt-2 p-2 bg-white/50 rounded text-sm text-gray-600">
                                    📝 {suggestion.notes}
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingNoteIndex(globalIndex);
                                    setNoteText(suggestion.notes || "");
                                  }}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {suggestion.notes ? "Edit notes" : "Add notes"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}