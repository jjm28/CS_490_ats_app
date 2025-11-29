import { useState, useEffect } from "react";

type ChecklistProps = {
  company: string;
  jobTitle: string;
  jobId: string;
};

type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

export default function Checklist({ company, jobTitle, jobId }: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: "1", text: `Research ${company}'s mission, values, and recent news`, completed: false },
    { id: "2", text: "Review the job description and requirements", completed: false },
    { id: "3", text: "Prepare answers to common interview questions", completed: false },
    { id: "4", text: "Prepare STAR method examples from past experiences", completed: false },
    { id: "5", text: `Practice technical skills relevant to ${jobTitle}`, completed: false },
    { id: "6", text: "Prepare questions to ask the interviewer", completed: false },
    { id: "7", text: "Review your resume and be ready to discuss each point", completed: false },
    { id: "8", text: "Test your technology (camera, microphone) for virtual interviews", completed: false },
    { id: "9", text: "Plan your outfit and interview location", completed: false },
    { id: "10", text: "Research your interviewers on LinkedIn", completed: false },
    { id: "11", text: "Prepare a 30-60-90 day plan for the role", completed: false },
    { id: "12", text: "Have copies of your resume, portfolio, and references ready", completed: false },
  ]);

  // Load checklist state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`checklist-${jobId}`);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load checklist:", e);
      }
    }
  }, [jobId]);

  // Save checklist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`checklist-${jobId}`, JSON.stringify(items));
  }, [items, jobId]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span className="font-semibold">
            {completedCount} / {totalCount} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map(item => (
          <label
            key={item.id}
            className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
              className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span
              className={`ml-3 flex-1 ${
                item.completed ? "text-gray-400 line-through" : "text-gray-700"
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* Completion message */}
      {completedCount === totalCount && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Great job! You're fully prepared for your interview!
          </p>
        </div>
      )}
    </div>
  );
}