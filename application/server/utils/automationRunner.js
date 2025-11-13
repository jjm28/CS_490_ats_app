// server/utils/automationRunner.js
import { initAutomationEngine } from "../services/automation/automationEngine.js";

export function startAutomationRunner() {
  console.log("🔥 Automation Runner Started");
  initAutomationEngine();
}