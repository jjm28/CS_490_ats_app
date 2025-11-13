import cron from "node-cron";
import AutomationRule from "../../models/automationRule.js";
import { runApplicationPackageRule } from "./applicationPackage.js";
import { runSubmissionScheduleRule } from "./submissionSchedule.js";
import { runFollowUpRule } from "./followUp.js";

function isValidApplicationPackageConfig(config) {
  if (!config) return false;
  const hasResume = config.resumeId && config.resumeId !== "";
  const hasCover = config.coverLetterId && config.coverLetterId !== "";
  const hasPortfolio =
    (config.portfolioUrl && config.portfolioUrl.trim() !== "") ||
    (Array.isArray(config.portfolioUrls) && config.portfolioUrls.length > 0);

  return hasResume || hasCover || hasPortfolio;
}

async function executeRule(rule) {
  try {
    switch (rule.type) {
      case "application_package":
        // 🚫 DO NOT AUTO-RUN EMPTY OR BAD PACKAGE RULES
        if (!isValidApplicationPackageConfig(rule.config)) {
          console.warn(
            `[automation] Skipped application_package rule ${rule._id}: missing resume/cover/portfolio`
          );
          await AutomationRule.updateOne(
            { _id: rule._id },
            { $set: { lastRunAt: new Date() } }
          );
          return;
        }

        // 🚀 ALLOW manual creation to run once
        await runApplicationPackageRule(rule);
        break;

      case "submission_schedule":
        await runSubmissionScheduleRule(rule);
        break;

      case "follow_up":
        await runFollowUpRule(rule);
        break;

      default:
        console.warn(`Unknown automation rule type: ${rule.type}`);
        return;
    }

    await AutomationRule.updateOne(
      { _id: rule._id },
      { $set: { lastRunAt: new Date() } }
    );

  } catch (err) {
    console.error("Automation rule error:", err);
  }
}

export function initAutomationEngine() {
  console.log("[automation] Engine started");

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const rules = await AutomationRule.find({
      enabled: { $ne: false },
      schedule: { $lte: now },
      $or: [
        { lastRunAt: null },
        { lastRunAt: { $exists: false } }
      ]
    });

    for (const rule of rules) {
      await executeRule(rule);
    }
  });
}