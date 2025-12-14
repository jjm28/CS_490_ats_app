// ProfileStrength.tsx
// Small card component that displays profile strength data passed as props
// Used in ProfilePage sidebar

import React from "react";

interface ProfileStrengthProps {
  score?: number | null;
  badge?: string;
  suggestions?: string[];
  comparison?: number;
  industryAverage?: number;
  breakdown?: {
    basicInfo: number;
    professionalSummary: number;
    experience: number;
    employment: number;
    education: number;
    skills: number;
    projects: number;
    certifications: number;
  };
}

const ProfileStrength: React.FC<ProfileStrengthProps> = ({
  score = 0,
  badge = "Getting Started",
  suggestions = [],
  comparison = 0,
  industryAverage = 65,
  breakdown,
}) => {
  // Ensure score is valid number
  const validScore = Math.min(Math.max(Number(score) || 0, 0), 100);

  // Dynamic color based on score
  const getBarColor = () => {
    if (validScore >= 90) return "bg-green-500";
    if (validScore >= 70) return "bg-blue-500";
    if (validScore >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Dynamic badge color
  const getBadgeColor = () => {
    if (badge === "All-Star") return "text-green-600 bg-green-50";
    if (badge === "Strong Profile") return "text-blue-600 bg-blue-50";
    if (badge === "On Your Way") return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  const barColor = getBarColor();
  const badgeColor = getBadgeColor();

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Profile Strength</h2>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${validScore}%` }}
        ></div>
      </div>

      {/* Score and badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-lg">{validScore}%</span> complete
        </p>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
          {badge}
        </span>
      </div>

      {/* Industry comparison */}
      <p className="text-xs text-gray-600 mb-3">
        Industry average: {industryAverage}%
        <span
          className={`ml-1 font-medium ${
            comparison >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          ({comparison >= 0 ? "+" : ""}
          {comparison}%)
        </span>
      </p>

      {/* Section Breakdown - Only show if breakdown data is provided */}
      {breakdown && (
        <div className="mt-4 mb-3">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">
            Section Breakdown
          </h3>
          <div className="space-y-2">
            {/* Basic Info */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Basic Info</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.basicInfo}/30
              </span>
            </div>
            {/* Professional Summary */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Summary</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.professionalSummary}/15
              </span>
            </div>
            {/* Experience */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Experience</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.experience}/10
              </span>
            </div>
            {/* Employment */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Employment</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.employment}/10
              </span>
            </div>
            {/* Education */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Education</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.education}/15
              </span>
            </div>
            {/* Skills */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Skills</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.skills}/10
              </span>
            </div>
            {/* Projects */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Projects</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.projects}/5
              </span>
            </div>
            {/* Certifications */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Certifications</span>
              <span className="text-xs font-medium text-gray-700">
                {breakdown.certifications}/5
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <h3 className="text-xs font-medium text-yellow-700 mb-1">
            Suggestions for improvement
          </h3>
          <ul className="text-xs text-yellow-800 space-y-1">
            {suggestions.slice(0, 3).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProfileStrength;