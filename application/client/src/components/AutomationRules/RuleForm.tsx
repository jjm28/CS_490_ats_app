import React, { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../StyledComponents/Button";

import {
  createAutomationRule,
  getAutomationRuleById,
  updateAutomationRule,
} from "../../api/automation";

// CONFIG COMPONENTS
import ApplicationPackageConfig from "../AutomationRules/ApplicationPackageConfig";
import SubmissionScheduleConfig from "../AutomationRules/SubmissionScheduleConfig";
import FollowUpConfig from "../AutomationRules/FollowUpReminderConfig";
import TemplateResponseConfig from "../AutomationRules/TemplateResponseConfig";
import ChecklistConfig from "../AutomationRules/ChecklistConfig";

const RuleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [type, setType] = useState("application_package");
  const [schedule, setSchedule] = useState("");
  const [config, setConfig] = useState<any>({});

  // Only these rule types actually need a visible schedule input
  const needsScheduleField =
    type === "submission_schedule" || type === "follow_up";

  // Load existing rule when editing
  useEffect(() => {
    if (!isEditing) return;

    const loadRule = async () => {
      try {
        const rule = await getAutomationRuleById(id!);

        setType(rule.type);

        // Backend stores schedule as ISO date string – convert for datetime-local
        if (rule.schedule) {
          const d = new Date(rule.schedule);
          const isoLocal = new Date(
            d.getTime() - d.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);
          setSchedule(isoLocal);
        } else {
          setSchedule("");
        }

        setConfig(rule.config ?? {});
      } catch (err) {
        console.error("Failed to load rule", err);
      }
    };

    loadRule();
  }, [id, isEditing]);

  // Save rule
  const submit = async (e: FormEvent) => {
    e.preventDefault();

    let effectiveSchedule = schedule;

    // For rules that REQUIRE a schedule: enforce
    if (needsScheduleField) {
      if (!effectiveSchedule) {
        alert("Please select a date and time for this rule to run.");
        return;
      }
    } else {
      // For rules that don't expose a schedule field, set it to "now"
      // so the backend/engine can immediately run them once.
      if (!effectiveSchedule) {
        effectiveSchedule = new Date()
          .toISOString()
          .slice(0, 16); // YYYY-MM-DDTHH:mm
      }
    }

    const payload = {
      type,
      schedule: effectiveSchedule,
      config,
    };

    try {
      if (isEditing) {
        await updateAutomationRule(id!, payload);
      } else {
        await createAutomationRule(payload);
      }

      navigate("/automation");
    } catch (err) {
      console.error(err);
      alert("Failed to save rule");
    }
  };

  // Render proper config UI
  const renderConfigComponent = () => {
    switch (type) {
      case "application_package":
        return (
          <ApplicationPackageConfig
            config={config}
            onChange={(updated) => setConfig(updated)}
          />
        );

      case "submission_schedule":
        return (
          <SubmissionScheduleConfig
            config={config}
            onChange={(updated) => setConfig(updated)}
          />
        );

      case "follow_up":
        return (
          <FollowUpConfig
            config={config}
            onChange={(updated) => setConfig(updated)}
          />
        );

      case "template_response":
        return (
          <TemplateResponseConfig
            config={config}
            onChange={(updated) => setConfig(updated)}
          />
        );

      case "checklist":
        return (
          <ChecklistConfig
            config={config}
            onChange={(updated) => setConfig(updated)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      {/* Back */}
      <Button
        variant="secondary"
        className="mb-4"
        onClick={() => navigate("/automation")}
      >
        ← Back to Rules
      </Button>

      <h1 className="text-2xl font-bold text-center mb-6">
        {isEditing ? "Edit Automation Rule" : "Create Automation Rule"}
      </h1>

      <form
        onSubmit={submit}
        className="bg-white shadow border rounded p-6 space-y-6"
      >
        {/* RULE TYPE */}
        <div>
          <label className="block font-semibold mb-1">Rule Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setConfig({}); // reset config when type changes
              // reset schedule only for types that actually use it
              if (!needsScheduleField) {
                setSchedule("");
              }
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="application_package">Application Package</option>
            <option value="submission_schedule">Schedule Submission</option>
            <option value="follow_up">Follow-Up Reminder</option>
            <option value="template_response">Template Response</option>
            <option value="checklist">Checklist Automation</option>
          </select>
        </div>

        {/* SCHEDULE (only for submission + follow-up) */}
        {needsScheduleField && (
          <div>
            <label className="block font-semibold mb-1">
              When should this run?
            </label>
            <input
              type="datetime-local"
              className="w-full border px-3 py-2 rounded"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              The job or reminder will be processed automatically at this date
              and time.
            </p>
          </div>
        )}

        {/* DYNAMIC CONFIG */}
        <div>
          <label className="block font-semibold mb-2">Rule Configuration</label>
          <div className="border rounded p-4 bg-gray-50">
            {renderConfigComponent()}
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="submit" variant="primary">
            {isEditing ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RuleForm;