type  TimelineProps = {
  stages: string[];
};

export default function  Timeline({ stages }:  TimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>

      {/* Stages */}
      <div className="space-y-6">
        {stages.map((stage, index) => (
          <div key={index} className="relative flex items-start">
            {/* Stage number circle */}
            <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold text-sm">
              {index + 1}
            </div>

            {/* Stage content */}
            <div className="ml-6 flex-1">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-800 font-medium">{stage}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}