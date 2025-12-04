// services/analytics.service.js
import User from "../models/user.js";
import Job from "../models/jobs.js";
import Cohort from "../models/Cohort/Cohort.js";
import CohortMember from "../models/Cohort/CohortMember.js";
import Organization from "../models/Org/Organization.js";

/**
 * Helper: parse from/to or default to last N days.
 */
function resolveDateRange(from, to, fallbackDays = 90) {
  let start, end;
  if (from) {
    start = new Date(from);
  }
  if (to) {
    end = new Date(to);
  }
  if (!start || Number.isNaN(start.getTime())) {
    end = end || new Date();
    start = new Date(end.getTime());
    start.setDate(start.getDate() - fallbackDays);
  }
  if (!end || Number.isNaN(end.getTime())) {
    end = new Date();
  }

  // normalize times
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { from: start, to: end };
}

/**
 * Determine if a job should be counted as "hired".
 * We use offerStage === "Offer Accepted" as the primary signal.
 */
function isJobHired(job) {
  if (!job) return false;
  if (job.offerStage === "Offer Accepted") return true;
  // fallback: finalSalary or salaryAnalysis.negotiation.finalOffer exists + status/offerStage looks final
  if (
    (job.finalSalary != null ||
      job?.salaryAnalysis?.negotiation?.finalOffer != null) &&
    (job.offerStage === "Offer Received" || job.offerStage === "Offer Accepted")
  ) {
    return true;
  }
  return false;
}

/**
 * Determine if a job should be treated as an "offer" for offerAcceptanceRate.
 */
function isJobOffer(job) {
  if (!job) return false;
  if (job.offerStage === "Offer Received" || job.offerStage === "Offer Accepted") {
    return true;
  }
  if (job.offerDate) return true;
  return false;
}

/**
 * Get job's application date for time-to-hire.
 */
function getApplicationDate(job) {
  if (!job) return null;
  const history = job.applicationHistory || [];
  if (Array.isArray(history) && history.length > 0 && history[0].date) {
    return new Date(history[0].date);
  }
  return job.createdAt ? new Date(job.createdAt) : null;
}

/**
 * Get job's hire date (offer date or fallback to updatedAt).
 */
function getHireDate(job) {
  if (!job) return null;
  if (job.offerDate) return new Date(job.offerDate);
  if (job.updatedAt) return new Date(job.updatedAt);
  return null;
}

/**
 * Get a single numeric "total compensation" estimate for ROI calculations.
 */
function getJobTotalComp(job) {
  if (!job) return null;
  if (job?.salaryAnalysis?.totalComp != null) {
    return Number(job.salaryAnalysis.totalComp);
  }
  if (job.finalSalary != null) {
    return Number(job.finalSalary);
  }
  if (job?.salaryAnalysis?.negotiation?.finalOffer != null) {
    return Number(job.salaryAnalysis.negotiation.finalOffer);
  }
  return null;
}

/**
 * Calculate analytics for an organization (and optional cohort) in a date range.
 */
export async function getOrgAnalyticsOverview({
  organizationId,
  cohortId,
  from,
  to,
}) {
  if (!organizationId) {
    const err = new Error("organizationId is required for analytics");
    err.statusCode = 400;
    throw err;
  }

  const { from: start, to: end } = resolveDateRange(from, to, 90);

  // 1) Resolve org & ROI config
  const org = await Organization.findOne({ _id: organizationId }).lean().catch(() => null);

  const fixedProgramCost = org?.fixedProgramCost || 0;
  const programCostPerJobSeeker = org?.programCostPerJobSeeker || 0;

  // 2) Resolve job seekers in org (filtered by cohort if provided)
  const userFilter = {
    organizationId,
    role: "job_seeker",
    isDeleted: false,
  };

  let cohortMembersUserIds = null;
  let selectedCohort = null;

  if (cohortId) {
    selectedCohort = await Cohort.findOne({
      _id: cohortId,
      organizationId,
    }).lean();

    if (!selectedCohort) {
      const err = new Error("Cohort not found for this organization");
      err.statusCode = 404;
      throw err;
    }

    const members = await CohortMember.find({
      cohortId: selectedCohort._id,
    })
      .select("jobSeekerUserId")
      .lean();

    cohortMembersUserIds = members.map((m) => m.jobSeekerUserId);

    if (cohortMembersUserIds.length === 0) {
      // no members: we still return metrics but they will be zeros
      cohortMembersUserIds = [];
    } else {
      userFilter._id = { $in: cohortMembersUserIds };
    }
  }

  const jobSeekers = await User.find(userFilter)
    .select("_id email")
    .lean();

  const jobSeekerIds = jobSeekers.map((u) => u._id.toString());

  const totalJobSeekers = jobSeekerIds.length;

  // 3) Fetch jobs for those job seekers in the date range
  // We'll use createdAt within [start, end] as the timeframe for now.
  // (ApplicationHistory can be used later if needed.)
  const jobs = await Job.find({
    userId: { $in: jobSeekerIds },
    archived: { $ne: true },
    createdAt: { $gte: start, $lte: end },
  }).lean();

  const totalApplications = jobs.length;

  // 4) Derive metrics from jobs
  let interviewCount = 0;
  let offerCount = 0;
  let hireCount = 0;
  let completedSearchCount = 0;
  let sumTimeToHireDays = 0;
  let hiresWithTimeToHire = 0;

  let sumTotalComp = 0;
  let hiresWithComp = 0;

  // per-user aggregates for insights
  const applicationsByUserId = {};
  const hiresByUserId = {};

  for (const job of jobs) {
    const uid = job.userId?.toString();
    if (!applicationsByUserId[uid]) applicationsByUserId[uid] = 0;
    applicationsByUserId[uid] += 1;

    // interviews
    const interviews = job.interviews || [];
    for (const iv of interviews) {
      if (!iv.date) continue;
      const d = new Date(iv.date);
      if (d >= start && d <= end) {
        interviewCount += 1;
      }
    }

    const hired = isJobHired(job);
    const offered = isJobOffer(job);

    if (offered) offerCount += 1;
    if (hired) {
      hireCount += 1;
      if (!hiresByUserId[uid]) hiresByUserId[uid] = 0;
      hiresByUserId[uid] += 1;

      const appDate = getApplicationDate(job);
      const hireDate = getHireDate(job);
      if (appDate && hireDate && hireDate >= appDate) {
        const diffMs = hireDate.getTime() - appDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        sumTimeToHireDays += diffDays;
        hiresWithTimeToHire += 1;
      }

      const totalComp = getJobTotalComp(job);
      if (totalComp != null) {
        sumTotalComp += totalComp;
        hiresWithComp += 1;
      }
    }

    // Completed searches: hired OR clearly rejected/declined
    const isDeclined =
      job.offerStage === "Offer Declined" ||
      job.negotiationOutcome === "Lost offer" ||
      job.status === "rejected";

    if (hired || isDeclined) {
      completedSearchCount += 1;
    }
  }

  // 5) Compute effectiveness metrics
  const activeJobSeekers = totalJobSeekers; // all non-deleted job seekers in scope
  const placementRate =
    completedSearchCount > 0 ? hireCount / completedSearchCount : 0;
  const avgTimeToHireDays =
    hiresWithTimeToHire > 0 ? sumTimeToHireDays / hiresWithTimeToHire : 0;
  const applicationsPerCandidate =
    activeJobSeekers > 0 ? totalApplications / activeJobSeekers : 0;

  // 6) Compute ROI / outcomes
  const avgSalary =
    hiresWithComp > 0 ? sumTotalComp / hiresWithComp : 0;
  const offerAcceptanceRate =
    offerCount > 0 ? hireCount / offerCount : 0;

  const estimatedProgramCost =
    fixedProgramCost + programCostPerJobSeeker * activeJobSeekers;

  const estimatedValueFromHires = sumTotalComp; // sum of totalComp from hired jobs
  const roi =
    estimatedProgramCost > 0
      ? (estimatedValueFromHires - estimatedProgramCost) /
        estimatedProgramCost
      : null;

  // 7) Cohort metrics (org-level, not just selected cohort)
  const orgCohorts = await Cohort.find({
    organizationId,
    status: { $in: ["active", "archived"] },
  })
    .sort({ name: 1 })
    .lean();

  const cohortStats = [];

  for (const cohort of orgCohorts) {
    const members = await CohortMember.find({ cohortId: cohort._id })
      .select("jobSeekerUserId")
      .lean();
    const memberUserIds = members.map((m) => m.jobSeekerUserId);

    if (memberUserIds.length === 0) {
      cohortStats.push({
        cohortId: cohort._id.toString(),
        name: cohort.name,
        memberCount: 0,
        activeJobSeekers: 0,
        applicationsPerCandidate: 0,
        placementRate: 0,
        hires: 0,
      });
      continue;
    }

    const cohortJobSeekers = await User.find({
      _id: { $in: memberUserIds },
      organizationId,
      role: "job_seeker",
      isDeleted: false,
    })
      .select("_id")
      .lean();
    const cohortJobSeekerIds = cohortJobSeekers.map((u) => u._id.toString());

    if (cohortJobSeekerIds.length === 0) {
      cohortStats.push({
        cohortId: cohort._id.toString(),
        name: cohort.name,
        memberCount: memberUserIds.length,
        activeJobSeekers: 0,
        applicationsPerCandidate: 0,
        placementRate: 0,
        hires: 0,
      });
      continue;
    }

    const cohortJobs = jobs.filter((j) =>
      cohortJobSeekerIds.includes(j.userId?.toString())
    );

    const cohortApplications = cohortJobs.length;
    let cohortHireCount = 0;
    let cohortCompleted = 0;

    for (const job of cohortJobs) {
      const hired = isJobHired(job);
      const isDeclined =
        job.offerStage === "Offer Declined" ||
        job.negotiationOutcome === "Lost offer" ||
        job.status === "rejected";

      if (hired) cohortHireCount += 1;
      if (hired || isDeclined) cohortCompleted += 1;
    }

    const cohortPlacementRate =
      cohortCompleted > 0 ? cohortHireCount / cohortCompleted : 0;

    const cohortApplicationsPerCandidate =
      cohortJobSeekerIds.length > 0
        ? cohortApplications / cohortJobSeekerIds.length
        : 0;

    cohortStats.push({
      cohortId: cohort._id.toString(),
      name: cohort.name,
      memberCount: memberUserIds.length,
      activeJobSeekers: cohortJobSeekerIds.length,
      applicationsPerCandidate: cohortApplicationsPerCandidate,
      placementRate: cohortPlacementRate,
      hires: cohortHireCount,
    });
  }

  // 8) Insights generation
  const insights = [];

  // Insight 1: low application volume
  if (activeJobSeekers >= 10 && applicationsPerCandidate < 3) {
    insights.push({
      type: "engagement",
      severity: "warning",
      message:
        "Application volume is low. Job seekers are submitting fewer than 3 applications on average in this period.",
      details:
        "Consider nudging candidates to aim for at least 5–10 high-quality applications per week.",
    });
  }

  // Insight 2: low placement rate
  if (completedSearchCount >= 10 && placementRate < 0.25) {
    insights.push({
      type: "outcome",
      severity: "warning",
      message:
        "Placement rate is below 25% for completed searches in this period.",
      details:
        "Review interview preparation, resume quality, and employer targeting – candidates may be getting to the final stages but not closing offers.",
    });
  }

  // Insight 3: long time-to-hire
  if (hiresWithTimeToHire >= 5 && avgTimeToHireDays > 60) {
    insights.push({
      type: "process",
      severity: "info",
      message:
        "Time-to-hire is long. Hires are taking more than 60 days on average.",
      details:
        "Encourage candidates to maintain a healthier application pipeline and follow up proactively. Consider more structured weekly goals.",
    });
  }

  // Insight 4: underperforming cohorts
  const orgPlacementRate = placementRate;
  for (const cs of cohortStats) {
    if (cs.memberCount < 10) continue; // ignore small cohorts
    if (cs.placementRate < orgPlacementRate - 0.15) {
      insights.push({
        type: "cohort-underperforming",
        severity: "warning",
        message: `Cohort "${cs.name}" is underperforming compared to org average.`,
        details: `Placement rate for this cohort is ${(cs.placementRate * 100).toFixed(
          1
        )}%, which is significantly below the overall ${(orgPlacementRate * 100).toFixed(
          1
        )}%. Consider targeted workshops or additional coaching.`,
      });
    }
  }

  // Insight 5: high-performing cohorts
  for (const cs of cohortStats) {
    if (cs.memberCount < 10) continue;
    if (cs.placementRate > orgPlacementRate + 0.15) {
      insights.push({
        type: "cohort-highperforming",
        severity: "success",
        message: `Cohort "${cs.name}" is outperforming the org average.`,
        details: `Placement rate for this cohort is ${(cs.placementRate * 100).toFixed(
          1
        )}%. Capture what’s working here and replicate across other cohorts.`,
      });
    }
  }

  // Insight 6: application volume vs hires (best-practice hint)
  let lowAppsUsers = 0;
  let lowAppsHires = 0;
  let highAppsUsers = 0;
  let highAppsHires = 0;

  const APP_THRESHOLD = 5;

  for (const uid of Object.keys(applicationsByUserId)) {
    const appCount = applicationsByUserId[uid] || 0;
    const hireCountForUser = hiresByUserId[uid] || 0;
    if (appCount >= APP_THRESHOLD) {
      highAppsUsers += 1;
      if (hireCountForUser > 0) highAppsHires += 1;
    } else {
      lowAppsUsers += 1;
      if (hireCountForUser > 0) lowAppsHires += 1;
    }
  }

  if (highAppsUsers >= 5 && lowAppsUsers >= 5) {
    const highRate =
      highAppsUsers > 0 ? highAppsHires / highAppsUsers : 0;
    const lowRate =
      lowAppsUsers > 0 ? lowAppsHires / lowAppsUsers : 0;

    if (highRate > lowRate * 1.5) {
      insights.push({
        type: "best-practice",
        severity: "info",
        message:
          "Job seekers who maintain a higher application volume are seeing better outcomes.",
        details: `In this period, candidates with at least ${APP_THRESHOLD} applications had a hire rate of ${(highRate * 100).toFixed(
          1
        )}%, compared to ${(lowRate * 100).toFixed(
          1
        )}% for those below that threshold. Encouraging consistent, high-quality activity may improve results.`,
      });
    }
  }

  // 9) Build final response object
  return {
    filters: {
      from: start.toISOString(),
      to: end.toISOString(),
      cohortId: cohortId || null,
    },
    effectiveness: {
      totalJobSeekers,
      activeJobSeekers,
      applicationsSubmitted: totalApplications,
      interviews: interviewCount,
      hires: hireCount,
      placementRate,
      averageTimeToHireDays: avgTimeToHireDays,
      applicationsPerCandidate,
      completedSearchCount,
      offerCount,
    },
    outcomes: {
      hires: hireCount,
      offers: offerCount,
      averageSalary: avgSalary,
      offerAcceptanceRate,
    },
    roi: {
      fixedProgramCost,
      programCostPerJobSeeker,
      estimatedProgramCost,
      estimatedValueFromHires,
      roi,
    },
    cohorts: cohortStats,
    insights,
  };
}
