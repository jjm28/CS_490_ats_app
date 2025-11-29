// automation/actions/templateResponse.js
import Jobs from "../../models/jobs.js";

/**
 * config shape:
 * {
 *   "jobId": "JOB_ID",
 *   "templateName": "thank_you",
 *   "variables": {
 *      "recruiterName": "Alex",
 *      "position": "Software Engineer",
 *      "company": "ACME Corp"
 *   }
 * }
 */
export async function runTemplateResponseRule(rule) {
  const { userId, config = {} } = rule;
  const { jobId, templateName = "thank_you", variables = {} } = config;

  if (!jobId) {
    console.warn("[automation] template_response: missing jobId");
    return;
  }

  const job = await Jobs.findOne({ _id: jobId, userId });
  if (!job) {
    console.warn(`[automation] template_response: job not found for ${jobId}`);
    return;
  }

  const text = buildTemplateText(templateName, variables, job);

  job.templateResponses = job.templateResponses || [];
  job.templateResponses.push({
    templateName,
    message: text,
    createdAt: new Date(),
  });

  job.applicationHistory = job.applicationHistory || [];
  job.applicationHistory.push({
    action: `Automation: generated template response (${templateName})`,
    timestamp: new Date(),
  });

  await job.save();
  console.log(
    `[automation] template_response: response generated for job ${job._id}`
  );
}

function buildTemplateText(templateName, vars, job) {
  const company = vars.company || job.company || "the company";
  const position = vars.position || job.title || "this role";
  const recruiterName = vars.recruiterName || "Hiring Manager";

  switch (templateName) {
    case "thank_you":
      return `Hi ${recruiterName},

Thank you again for the opportunity to interview for the ${position} position at ${company}. I appreciate your time and enjoyed learning more about the team and the role.

Please let me know if there is any additional information I can provide.

Best regards,
[Your Name]`;

    case "application_follow_up":
      return `Hi ${recruiterName},

I hope you're doing well. I wanted to follow up on my application for the ${position} position at ${company}. I'm still very interested in the opportunity and would love to discuss how I can contribute to your team.

Thank you for your time and consideration.

Best,
[Your Name]`;

    default:
      return `Automated response (${templateName}) for ${position} at ${company}. Please customize this text.`;
  }
}