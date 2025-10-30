import React from "react";

interface ProfileStrengthProps {
  score?: number | null; // allow undefined or null
  badge?: string;
  suggestions?: string[];
  comparison?: number;
  industryAverage?: number;
}

const ProfileStrength: React.FC<ProfileStrengthProps> = ({
  score = 0, // default to 0 if missing
  badge = "No badge",
  suggestions = [],
  comparison = 0,
  industryAverage = 0,
}) => {
  // Ensure score is a valid number between 0 and 100
  const validScore = Math.min(Math.max(Number(score) || 0, 0), 100);

  // Predefine Tailwind colors so purge won't remove them
  const barColor =
    validScore >= 90
      ? "bg-green-500"
      : validScore >= 70
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border mt-6">
      <h2 className="text-lg font-semibold text-gray-800">Profile Strength</h2>

      {/* Progress bar container */}
      <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${validScore}%` }}
        ></div>
      </div>

      <p className="mt-2 text-sm text-gray-700">
        {validScore}% complete — <span className="font-semibold">{badge}</span>
      </p>

      <p className="text-xs text-gray-600 mt-1">
        Industry average: {industryAverage}% ({comparison >= 0 ? "+" : ""}
        {comparison}% vs average)
      </p>

      {suggestions.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <h3 className="text-sm font-medium text-yellow-700 mb-1">
            Suggestions for improvement
          </h3>
          <ul className="list-disc ml-5 text-sm text-yellow-800">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProfileStrength;
