// server/models/automationRule.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * AutomationRule
 *
 * type:
 *  - "application_package"
 *  - "submission_schedule"
 *  - "follow_up"
 *  - "template_response"
 *  - "checklist"
 *
 * schedule: only required for follow_up (when reminder should fire)
 * enabled: if false, engine will skip
 * lastRunAt: when it last successfully executed
 */
const AutomationRuleSchema = new Schema(
  {
    userId: {
      type: String, // keep as string to match your existing userId usage
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "application_package",
        "submission_schedule",
        "follow_up",
        "template_response",
        "checklist",
      ],
      required: true,
    },
    schedule: {
      type: Date,
      // only required for follow-up reminders
      required: function () {
        return this.type === "follow_up";
      },
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AutomationRule = mongoose.model(
  "AutomationRule",
  AutomationRuleSchema
);
export default AutomationRule;