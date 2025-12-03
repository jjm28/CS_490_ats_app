import Jobs from "../models/jobs.js";
import { buildTimingInsights } from "../utils/timingInsights.js";

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

  // ---- GROUPING BUCKETS ----
  const byIndustry = {};
  const byRoleType = {};
  const byMethod = {};
  const bySource = {};

  function addToGroup(group, key, job) {
    if (!group[key]) {
      group[key] = { applied: 0, interviews: 0, offers: 0 };
    }
    if (job.status !== "interested") group[key].applied++;
    if (job.status === "phone_screen" || job.status === "interview")
      group[key].interviews++;
    if (job.status === "offer") group[key].offers++;
  }

  // ---- MAIN LOOP (ONE LOOP ONLY!) ----
  for (const job of jobs) {
    const industry = job.industry?.trim();
    const roleType = job.type?.trim();
    const method = job.applicationMethod?.trim();
    const source = job.applicationSource?.trim();

    // INDUSTRY
    if (industry && industry !== "Other") {
      addToGroup(byIndustry, industry, job);
    }

    // ROLE TYPE (keep even if other fields are "Other")
    if (roleType && roleType !== "Other") {
      addToGroup(byRoleType, roleType, job);
    }

    // APPLICATION METHOD
    if (method && method !== "Other") {
      addToGroup(byMethod, method, job);
    }

    // APPLICATION SOURCE
    if (source && source !== "Other") {
      addToGroup(bySource, source, job);
    }
  }

  // ---- FORMAT FUNCTION ----
  const format = (obj) =>
    Object.entries(obj).map(([segment, stats]) => ({
      segment,
      ...calculateRates(stats.applied, stats.interviews, stats.offers),
    }));

  // ---- TIMING INSIGHTS ----
  const dayMap = {
    Sun: { day: "Sun", applied: 0, interviews: 0, offers: 0 },
    Mon: { day: "Mon", applied: 0, interviews: 0, offers: 0 },
    Tue: { day: "Tue", applied: 0, interviews: 0, offers: 0 },
    Wed: { day: "Wed", applied: 0, interviews: 0, offers: 0 },
    Thu: { day: "Thu", applied: 0, interviews: 0, offers: 0 },
    Fri: { day: "Fri", applied: 0, interviews: 0, offers: 0 },
    Sat: { day: "Sat", applied: 0, interviews: 0, offers: 0 },
  };

  const longToShort = {
    Sunday: "Sun",
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
  };

  for (const job of jobs) {
    const hist = job.statusHistory || [];

    const appliedEntry = hist.find((h) => h.status === "applied");
    if (!appliedEntry) continue;

    const dayLong = new Date(appliedEntry.timestamp).toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    const key = longToShort[dayLong];
    if (!key || !dayMap[key]) continue;

    dayMap[key].applied++;

    if (hist.some((h) => h.status === "interview")) {
      dayMap[key].interviews++;
    }

    if (hist.some((h) => h.status === "offer")) {
      dayMap[key].offers++;
    }
  }

  const timingPatterns = buildTimingInsights(Object.values(dayMap));

  return {
    byIndustry: format(byIndustry),
    byRoleType: format(byRoleType),
    byMethod: format(byMethod),
    bySource: format(bySource),

    successVsRejected: {
      industries: format(byIndustry),
      applicationMethods: format(byMethod),
      applicationSources: format(bySource),
      roleTypes: format(byRoleType),
    },

    resumeImpact: {
      customizedResumeRate: 0,
      genericResumeRate: 0,
      customizedCoverRate: 0,
      genericCoverRate: 0,
    },

    timingPatterns,
  };
}