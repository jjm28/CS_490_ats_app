import AutomationRule from "../../models/automationRule.js";
import { runFollowUpRule } from "./followUp.js";
import { runApplicationPackageRule } from "./applicationPackage.js";

export async function processDueAutomationRules() {
  const now = new Date();

  // Fetch ANY rule that should run
  const rules = await AutomationRule.find({
    enabled: { $ne: false },
    schedule: { $lte: now },
    $or: [
      { lastRunAt: null },
      { lastRunAt: { $exists: false } }
    ],
  }).lean();

  if (!rules.length) return;

  console.log(`[automation] Found ${rules.length} rule(s) due at ${now}`);

  for (const rule of rules) {
    try {
      if (rule.type === "follow_up") {
        await runFollowUpRule(rule);
      }

      // mark as executed
      await AutomationRule.updateOne(
        { _id: rule._id },
        { $set: { lastRunAt: now } }
      );

    } catch (err) {
      console.error(`[automation] Error running rule ${rule._id}`, err);
    }
  }
}