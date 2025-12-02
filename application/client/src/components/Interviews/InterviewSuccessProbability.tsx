// src/components/Interviews/InterviewSuccessProbability.tsx
import { useState, useEffect } from "react";
import {
  getUpcomingPredictions,
  recalculatePrediction,
  markRecommendationComplete,
  type SuccessPrediction,
} from "../../api/interviewPredictions";
import { useInterviewPredictionSync } from '../../hooks/useInterviewPredictionSync';

interface InterviewSuccessProbabilityProps {
  onBack: () => void;
}

export default function InterviewSuccessProbability({ onBack }: InterviewSuccessProbabilityProps) {
  const [predictions, setPredictions] = useState<SuccessPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const { triggerRecalculation } = useInterviewPredictionSync();

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUpcomingPredictions();
      setPredictions(data);
    } catch (err: any) {
      console.error("Error fetching predictions:", err);
      setError(err.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async (interviewId: string, jobId: string) => {
    setRecalculating(interviewId);
    try {
      await recalculatePrediction(interviewId, jobId);
      await fetchPredictions(); // Refresh data
    } catch (err: any) {
      console.error("Error recalculating:", err);
      alert("Failed to recalculate prediction");
    } finally {
      setRecalculating(null);
    }
  };

  const handleCompleteRecommendation = async (
    predictionId: string,
    recommendationIndex: number,
    interviewId: string,
    jobId: string
  ) => {
    try {
      await markRecommendationComplete(predictionId, recommendationIndex);
      // Auto-recalculate to reflect any changes in underlying data
      await recalculatePrediction(interviewId, jobId);
      await fetchPredictions(); // Refresh data
    } catch (err: any) {
      console.error("Error completing recommendation:", err);
      alert("Failed to mark recommendation as complete");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E3B43] text-white p-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          ← Back to Interview Suite
        </button>
        <div className="text-center">Loading predictions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E3B43] text-white p-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        ← Back to Interview Suite
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎯 Interview Success Probability</h1>
        <p className="text-white/70">
          AI-powered predictions to help you prepare effectively
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">⚠️ {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && predictions.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-white/5 rounded-lg p-8">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-semibold mb-2">No Upcoming Interviews</h2>
            <p className="text-white/70 mb-4">
              Schedule interviews in the Jobs page to see success probability predictions
            </p>
          </div>
        </div>
      )}

      {/* Predictions List */}
      {predictions.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-6">
          {predictions.map((prediction) => (
            <PredictionCard
              key={prediction._id}
              prediction={prediction}
              onRecalculate={handleRecalculate}
              onCompleteRecommendation={handleCompleteRecommendation}
              isRecalculating={recalculating === prediction.interviewId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper Components

interface PredictionCardProps {
  prediction: SuccessPrediction;
  onRecalculate: (interviewId: string, jobId: string) => void;
  onCompleteRecommendation: (predictionId: string, index: number, interviewId: string, jobId: string) => void;
  isRecalculating: boolean;
}

function PredictionCard({
  prediction,
  onRecalculate,
  onCompleteRecommendation,
  isRecalculating,
}: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { interviewContext, successProbability, confidence, factors, recommendations } =
    prediction;

  // Color coding for probability
  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "text-green-400";
    if (prob >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getProbabilityBgColor = (prob: number) => {
    if (prob >= 70) return "bg-green-500/20 border-green-500/30";
    if (prob >= 50) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  // Confidence badge
  const confidenceBadge = {
    high: { color: "bg-green-500/20 text-green-300 border-green-500/30", icon: "✓" },
    medium: { color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: "~" },
    low: { color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: "?" },
  };

  const badge = confidenceBadge[confidence];

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Company & Job Info */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">
              {interviewContext.jobTitle}
            </h3>
            <p className="text-white/70 mb-2">{interviewContext.company}</p>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span className="capitalize">{interviewContext.interviewType} Interview</span>
              <span>•</span>
              <span>
                {new Date(interviewContext.interviewDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>•</span>
              <span>
                {interviewContext.daysUntilInterview === 0
                  ? "Today"
                  : interviewContext.daysUntilInterview === 1
                  ? "Tomorrow"
                  : `${interviewContext.daysUntilInterview} days away`}
              </span>
            </div>
          </div>

          {/* Right: Success Probability */}
          <div className="text-right">
            <div className={`text-5xl font-bold mb-1 ${getProbabilityColor(successProbability)}`}>
              {successProbability}%
            </div>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${badge.color}`}>
              <span>{badge.icon}</span>
              <span>{confidence} confidence</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="mt-4 text-center text-white/40 text-sm">
          {expanded ? "▲ Click to collapse" : "▼ Click to see details"}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-white/10 p-6 space-y-6">
          {/* Factor Breakdown */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center justify-between">
              <span>📊 Score Breakdown</span>
              <button
                onClick={() => onRecalculate(prediction.interviewId, prediction.jobId)}
                disabled={isRecalculating}
                className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
              >
                {isRecalculating ? "Recalculating..." : "🔄 Recalculate"}
              </button>
            </h4>
            <div className="space-y-3">
              <FactorBar
                label="Preparation"
                score={factors.preparationScore}
                weight={prediction.weights.preparation}
              />
              <FactorBar
                label="Company Research"
                score={factors.companyResearchScore}
                weight={prediction.weights.companyResearch}
              />
              <FactorBar
                label="Practice Sessions"
                score={factors.practiceScore}
                weight={prediction.weights.practice}
              />
              <FactorBar
                label="Past Performance"
                score={factors.historicalPerformance}
                weight={prediction.weights.historicalPerformance}
              />
              <FactorBar
                label="Role Match"
                score={factors.roleMatchScore}
                weight={prediction.weights.roleMatch}
              />
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">💡 Action Items</h4>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <RecommendationItem
                    key={index}
                    recommendation={rec}
                    jobId={prediction.jobId}
                    interviewId={prediction.interviewId}
                    onComplete={() => onCompleteRecommendation(
                      prediction._id, 
                      index, 
                      prediction.interviewId, 
                      prediction.jobId
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FactorBarProps {
  label: string;
  score: number;
  weight: number;
}

function FactorBar({ label, score, weight }: FactorBarProps) {
  const getColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-white/90">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">({Math.round(weight * 100)}% weight)</span>
          <span className="text-white font-semibold">{score}/100</span>
        </div>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getColor(score)} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

interface RecommendationItemProps {
  recommendation: SuccessPrediction["recommendations"][0];
  onComplete: () => void;
  jobId: string;
  interviewId: string;
}

function RecommendationItem({ recommendation, onComplete, jobId, interviewId }: RecommendationItemProps) {
  const priorityColors = {
    high: "border-red-500/30 bg-red-500/10",
    medium: "border-yellow-500/30 bg-yellow-500/10",
    low: "border-blue-500/30 bg-blue-500/10",
  };

  const priorityIcons = {
    high: "🔥",
    medium: "⚡",
    low: "💡",
  };

  // Determine action link based on category
  const getActionLink = () => {
    switch (recommendation.category) {
      case 'preparation':
        return `/Jobs/${jobId}`; // Job details page with checklist
      case 'research':
        return `/company-research?jobId=${jobId}`;
      case 'practice':
        return `/Interview-Prep`; // Mock interview page
      case 'strategy':
      case 'timing':
      default:
        return null; // No direct link, just mark complete
    }
  };

  const actionLink = getActionLink();

  return (
    <div
      className={`border rounded-lg p-3 ${priorityColors[recommendation.priority]} ${
        recommendation.completed ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{priorityIcons[recommendation.priority]}</span>
            <span className="text-xs font-semibold uppercase text-white/70">
              {recommendation.priority} priority
            </span>
            <span className="text-xs text-white/50">
              +{recommendation.potentialImpact}% impact
            </span>
          </div>
          <p className="text-sm text-white/90">{recommendation.action}</p>
        </div>
        <div className="flex items-center gap-2">
          {!recommendation.completed && actionLink && (
            <a
              href={actionLink}
              className="text-xs px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded transition-colors whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              → Go
            </a>
          )}
          {!recommendation.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors whitespace-nowrap"
            >
              ✓ Done
            </button>
          )}
          {recommendation.completed && (
            <span className="text-xs text-green-400">✓ Complete</span>
          )}
        </div>
      </div>
    </div>
  );
}