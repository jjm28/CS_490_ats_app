// client/src/components/AutomationRules/RuleList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAutomationRules,
  deleteAutomationRule,
} from "../../api/automation";
import Button from "../StyledComponents/Button";

interface AutomationRule {
  _id: string;
  type: string;
  schedule?: string;
  config: any;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  application_package: "Application Package",
  submission_schedule: "Schedule Submission",
  follow_up: "Follow-Up Reminder",
  template_response: "Template Response",
  checklist: "Checklist Automation",
};

const RuleList: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    try {
      const data = await getAutomationRules();
      setRules(data);
    } catch (err) {
      console.error("Failed to load rules:", err);
    }
    setLoading(false);
  };

  const removeRule = async (id: string) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await deleteAutomationRule(id);
      loadRules();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;

  if (rules.length === 0)
    return (
      <p className="text-center text-gray-500">
        No automation rules yet. Create one above.
      </p>
    );

  return (
    <div className="space-y-4 mt-6">
      {rules.map((rule) => {
        const label = LABELS[rule.type] || rule.type;
        const isFollowUp = rule.type === "follow_up";

        return (
          <div
            key={rule._id}
            className="border p-4 shadow-sm rounded bg-white flex justify-between items-start"
          >
            <div>
              <h3 className="font-bold text-lg">{label}</h3>
              {isFollowUp && rule.schedule && (
                <p className="text-sm text-gray-600">
                  Runs at:{" "}
                  {new Date(rule.schedule).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {!isFollowUp && (
                <p className="text-sm text-gray-500">
                  Runs instantly when created.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => navigate(`/automation/${rule._id}/edit`)}
              >
                Edit
              </Button>

              <Button
                variant="secondary"
                onClick={() => removeRule(rule._id)}
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RuleList;