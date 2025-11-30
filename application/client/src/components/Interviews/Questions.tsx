import { useState } from "react";

type  QuestionProps = {
  questions: string[];
};

export default function  Question({ questions }:  QuestionProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div
          key={index}
          className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
        >
          <button
            onClick={() => toggleQuestion(index)}
            className="w-full p-4 text-left flex items-start justify-between"
          >
            <div className="flex items-start flex-1">
              <span className="text-blue-600 font-semibold mr-3 mt-0.5">Q{index + 1}.</span>
              <span className="text-gray-800 font-medium">{question}</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${
                expandedQuestions.has(index) ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedQuestions.has(index) && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-200 bg-white">
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Practice your answer using the STAR method (Situation, Task, Action, Result)
                </p>
                <textarea
                  placeholder="Write your answer here..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}