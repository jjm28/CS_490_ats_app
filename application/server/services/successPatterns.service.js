// services/successPatterns.service.js
import Jobs from "../models/jobs.js";
import { normalizeCompanySize } from "./companyResearch.service.js";

function calculateRates(total, offers) {
  return total ? Math.round((offers / total) * 100) : 0;
}

export async function computeSuccessPatterns(userId) {
  const jobs = await Jobs.find({ userId });

  const industries = {};
  const companies = {};
  const methods = {};
  const sources = {};

  for (const job of jobs) {
    const industry = job.industry || "Unknown";
    const companySize = normalizeCompanySize(job.companySize) || "Unknown";
    const method = job.applicationMethod || "Other";
    const source = job.applicationSource || "Other";

    function add(group, key) {
      if (!group[key]) group[key] = { total: 0, offers: 0 };
      group[key].total++;
      if (job.status === "offer") group[key].offers++;
    }

    add(industries, industry);
    add(companies, companySize);
    add(methods, method);
    add(sources, source);
  }

  const format = (obj) =>
    Object.entries(obj).map(([segment, stats]) => ({
      segment,
      offerRate: calculateRates(stats.total, stats.offers),
    }));

  return {
    industries: format(industries),
    companies: format(companies),
    applicationMethods: format(methods),
    applicationSources: format(sources),
  };
}