import { useState, useEffect } from "react";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import { useInterviewPredictionSync } from "../../hooks/useInterviewPredictionSync";

interface ChecklistItem {
  id: string;
  category: 'research' | 'logistics' | 'materials' | 'practice' | 'mindset';
  task: string;
  completed: boolean;
  completedAt?: Date;
  order: number;
}

interface ChecklistData {
  items: ChecklistItem[];
  generatedAt: Date;
  lastUpdatedAt: Date;
}

interface InterviewChecklistProps {
  jobId: string;
  interviewId: string;
  checklist?: ChecklistData;
  onChecklistUpdate?: () => void;
  compact?: boolean; // For different display modes
}

const categoryInfo: Record<string, { name: string; icon: string; color: string }> = {
  research: { name: "Company Research", icon: "🔍", color: "bg-blue-50 border-blue-200" },
  logistics: { name: "Logistics", icon: "📍", color: "bg-green-50 border-green-200" },
  materials: { name: "Materials & Portfolio", icon: "📄", color: "bg-purple-50 border-purple-200" },
  practice: { name: "Practice & Preparation", icon: "💪", color: "bg-orange-50 border-orange-200" },
  mindset: { name: "Mindset & Wellbeing", icon: "🧠", color: "bg-pink-50 border-pink-200" },
};

export default function InterviewChecklist({
  jobId,
  interviewId,
  checklist: initialChecklist,
  onChecklistUpdate,
  compact = false
}: InterviewChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistData | null>(initialChecklist || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  const { triggerRecalculation } = useInterviewPredictionSync();

  // Sync with prop changes
  useEffect(() => {
    if (initialChecklist) {
      setChecklist(initialChecklist);
    }
  }, [initialChecklist]);

  // Generate checklist
  const handleGenerateChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/generate-checklist`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setChecklist(data.checklist);
        setExpanded(true);
        onChecklistUpdate?.();
      } else {
        alert("Failed to generate checklist");
      }
    } catch (err) {
      console.error("Error generating checklist:", err);
      alert("Error generating checklist");
    } finally {
      setLoading(false);
    }
  };

  // Toggle checklist item
  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/interview/${interviewId}/checklist/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completed }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setChecklist(data.checklist);
        // onChecklistUpdate?.();
        triggerRecalculation(jobId, interviewId);
      } else {
        console.error("Failed to update checklist item");
      }
    } catch (err) {
      console.error("Error updating checklist item:", err);
    }
  };

  // Calculate progress
  const getProgress = () => {
    if (!checklist?.items?.length) return 0;
    const completed = checklist.items.filter(item => item.completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  // Group items by category
  const groupByCategory = () => {
    if (!checklist?.items) return {};
    
    const grouped: Record<string, ChecklistItem[]> = {
      research: [],
      logistics: [],
      materials: [],
      practice: [],
      mindset: [],
    };

    checklist.items.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  };

  const progress = getProgress();
  const groupedItems = groupByCategory();

  // If no checklist exists yet
  if (!checklist || checklist.items.length === 0) {
    return (
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={handleGenerateChecklist}
          disabled={loading}
        >
          {loading ? "Generating Checklist..." : "📋 Generate Preparation Checklist"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-semibold text-sm hover:text-blue-600 transition-colors"
        >
          <span>{expanded ? "▼" : "▶"}</span>
          <span>Interview Preparation Checklist</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 font-medium">
            {progress}% ({checklist.items.filter(i => i.completed).length}/{checklist.items.length})
          </span>
        </div>
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <div className="space-y-3">
          {Object.entries(groupedItems).map(([category, items]) => {
            if (items.length === 0) return null;
            
            const info = categoryInfo[category];
            const categoryCompleted = items.filter(item => item.completed).length;
            
            return (
              <div key={category} className={`border rounded-lg p-3 ${info.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <h6 className="font-medium text-sm flex items-center gap-2">
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </h6>
                  <span className="text-xs text-gray-600">
                    {categoryCompleted}/{items.length}
                  </span>
                </div>
                
                <ul className="space-y-2">
                  {items.sort((a, b) => a.order - b.order).map(item => (
                    <li key={item.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                        className="mt-1 w-4 h-4 cursor-pointer"
                      />
                      <label
                        className={`text-sm cursor-pointer ${
                          item.completed
                            ? "line-through text-gray-500"
                            : "text-gray-700"
                        }`}
                        onClick={() => handleToggleItem(item.id, !item.completed)}
                      >
                        {item.task}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}