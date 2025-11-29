import Jobs from "../models/jobs.js";
import { normalizeCompanySize } from "./companyResearch.service.js";

function calculateRates(applied, interviews, offers) {
  return {
    applied,
    interviews,
    offers,
    interviewRate: applied ? Math.round((interviews / applied) * 100) : 0,
    offerRate: applied ? Math.round((offers / applied) * 100) : 0,
  };
}

export async function computeSuccessAnalysis(userId) {
  const jobs = await Jobs.find({ userId });

  const byIndustry = {};
  const byCompanySize = {};
  const byRoleType = {};

  for (const job of jobs) {
    const industry = job.industry || "Unknown";
    const roleType = job.type || "Unknown";

    // normalize size from stored value
    const companySize = normalizeCompanySize(job.companySize) || "Unknown";

    function addToGroup(group, key) {
      if (!group[key]) {
        group[key] = { applied: 0, interviews: 0, offers: 0 };
      }
      if (job.status !== "interested") group[key].applied++;
      if (job.status === "phone_screen" || job.status === "interview")
        group[key].interviews++;
      if (job.status === "offer") group[key].offers++;
    }

    addToGroup(byIndustry, industry);
    addToGroup(byCompanySize, companySize);
    addToGroup(byRoleType, roleType);
  }

  const format = (obj) =>
    Object.entries(obj).map(([segment, stats]) => ({
      segment,
      ...calculateRates(stats.applied, stats.interviews, stats.offers),
    }));

  // ---- GROUP BY APPLICATION METHOD ----
  const byMethod = {};
  for (const job of jobs) {
    const method = job.applicationMethod || "Other";

    if (!byMethod[method]) {
      byMethod[method] = { applied: 0, interviews: 0, offers: 0 };
    }

    if (job.status !== "interested") byMethod[method].applied++;
    if (job.status === "phone_screen" || job.status === "interview")
      byMethod[method].interviews++;
    if (job.status === "offer") byMethod[method].offers++;
  }

  // ---- GROUP BY APPLICATION SOURCE ----
  const bySource = {};
  for (const job of jobs) {
    const source = job.applicationSource || "Other";

    if (!bySource[source]) {
      bySource[source] = { applied: 0, interviews: 0, offers: 0 };
    }

    if (job.status !== "interested") bySource[source].applied++;
    if (job.status === "phone_screen" || job.status === "interview")
      bySource[source].interviews++;
    if (job.status === "offer") bySource[source].offers++;
  }

  return {
    byIndustry: format(byIndustry),
    byCompanySize: format(byCompanySize),
    byRoleType: format(byRoleType),

    byMethod: format(byMethod),
    bySource: format(bySource),

    // ----------------------------------
    // NEW FIELDS FOR YOUR FRONTEND
    // ----------------------------------

    successVsRejected: {
      industries: format(byIndustry),
      companies: format(byCompanySize),
      applicationMethods: format(byMethod),
      applicationSources: format(bySource)
    },

    resumeImpact: {
      customizedResumeRate: 0,
      genericResumeRate: 0,
      customizedCoverRate: 0,
      genericCoverRate: 0
    },

    timingPatterns: {
      bestDays: ["No data"],
      worstDays: ["No data"]
    }
  };
}