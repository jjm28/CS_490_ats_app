import React from "react";

interface StatusHistoryItem {
  status: string;
  timestamp: string;
}

interface Props {
  history: StatusHistoryItem[];
}

const statusLabels: Record<string, string> = {
  interested: "Interested",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected"
};

const ApplicationTimeline: React.FC<Props> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-gray-500 text-sm">No status history recorded.</p>;
  }

  const timeline = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="relative border-l border-gray-300 pl-6 mt-6 space-y-6">

      {timeline.map((entry, i) => (
        <div key={i} className="relative">
          {/* Dot */}
          <span className="absolute -left-3 w-3 h-3 bg-blue-500 rounded-full border border-white"></span>

          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">
              {statusLabels[entry.status] || entry.status}
            </span>

            <span className="text-xs text-gray-500">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      ))}

    </div>
  );
};

export default ApplicationTimeline;