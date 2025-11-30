// services/competitiveAnalysis.service.js

import Jobs from "../models/jobs.js";
import ProductivitySession from "../models/productivitySession.js";
import { listEmployment } from "./employment.service.js";
import { getSkillsByUser } from "../routes/skills.js"; // ⬅️ use skills stored via Skills page

// -----------------------------
// Config: role stacks & ranges
// -----------------------------

const ROLE_STACKS = {
  swe: [
    "javascript",
    "typescript",
    "react",
    "node.js",
    "express",
    "sql",
    "git",
    "testing",
    "rest api",
  ],
  data: [
    "python",
    "sql",
    "pandas",
    "numpy",
    "scikit-learn",
    "data visualization",
    "statistics",
  ],
  pm: [
    "roadmapping",
    "user research",
    "requirements gathering",
    "jira",
    "stakeholder management",
    "analytics",
  ],
};

const ROLE_EXPERIENCE_RANGES = {
  entry: { min: 0, max: 2 },
  mid: { min: 2, max: 5 },
  senior: { min: 5, max: 10 },
  lead: { min: 7, max: 15 },
};

// Simple peer benchmarks (anonymous/heuristic)
const PEER_BENCHMARKS = {
  interviewsPerApplication: {
    average: 0.2,
    top: 0.35,
  },
  offersPerInterview: {
    average: 0.15,
    top: 0.3,
  },
  hoursPerWeek: {
    average: 5,
    top: 10,
  },
};

// -----------------------------
// Helpers
// -----------------------------

function analyzeJobFunnel(jobs) {
  let applications = 0;
  let interviews = 0;
  let offers = 0;

  for (const job of jobs) {
    if (!job || job.status === "interested") continue;

    applications++;

    if (job.status === "phone_screen" || job.status === "interview") {
      interviews++;
    }

    if (job.status === "offer") {
      offers++;
      if (!interviews) interviews++;
    }
  }

  const interviewsPerApplication =
    applications > 0 ? interviews / applications : 0;
  const offersPerInterview = interviews > 0 ? offers / interviews : 0;

  return {
    applications,
    interviews,
    offers,
    interviewsPerApplication,
    offersPerInterview,
  };
}

async function computeTimePerWeek(userId) {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const activityTypes = [
    "job_search",
    "job_research",
    "job_focus",
    "salary_research",
    "company_research",
    "interview_prep",
    "resume_edit",
    "coverletter_edit",
  ];

  const sessions = await ProductivitySession.find({
    userId,
    startedAt: { $gte: since },
    activityType: { $in: activityTypes },
  }).lean();

  if (!sessions || sessions.length === 0) {
    return {
      hoursPerWeek: 0,
      totalMinutes: 0,
      sessions: 0,
      minutesPerWeek: 0,
    };
  }

  let totalMinutes = 0;

  for (const s of sessions) {
    if (typeof s.durationMinutes === "number") {
      totalMinutes += s.durationMinutes;
      continue;
    }

    if (s.startedAt && s.endedAt) {
      const start = new Date(s.startedAt);
      const end = new Date(s.endedAt);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const diff = (end.getTime() - start.getTime()) / (1000 * 60);
        if (diff > 0) totalMinutes += diff;
      }
    }
  }

  const minutesPerWeek = totalMinutes / (30 / 7);
  const hoursPerWeek = minutesPerWeek / 60;

  return {
    hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
    totalMinutes: Math.round(totalMinutes),
    sessions: sessions.length,
    minutesPerWeek: Math.round(minutesPerWeek),
  };
}

// 🔹 NEW: fetch skills from the Skills collection and normalize to lowercased names
async function fetchUserSkillNames(userId) {
  const docs = await getSkillsByUser(userId); // reads from "skills" collection :contentReference[oaicite:1]{index=1}
  if (!docs || !docs.length) return [];
  return docs
    .map((s) => String(s.name || "").trim().toLowerCase())
    .filter(Boolean);
}

function computeSkillGaps(targetRole, userSkillNames) {
  const roleKey = targetRole?.toLowerCase?.() || "swe";
  const standardStack = ROLE_STACKS[roleKey] || ROLE_STACKS["swe"];

  const userSkills = (userSkillNames || []).map((s) =>
    String(s).trim().toLowerCase()
  );

  const matchedSkills = standardStack.filter((s) => userSkills.includes(s));
  const missingSkills = standardStack.filter((s) => !userSkills.includes(s));

  const coveragePercent =
    standardStack.length === 0
      ? 0
      : Math.round((matchedSkills.length / standardStack.length) * 100);

  return {
    roleKey,
    standardStack,
    userSkills,
    matchedSkills,
    missingSkills,
    coveragePercent,
  };
}

function getExperienceRangeForLevel(roleLevel) {
  const key = roleLevel?.toLowerCase?.() || "entry";
  return ROLE_EXPERIENCE_RANGES[key] || ROLE_EXPERIENCE_RANGES["entry"];
}

function classifyAgainstBenchmarks(value, average, top) {
  if (value == null || Number.isNaN(value)) return "unknown";
  if (value >= top) return "top";
  if (value >= average) return "above_average";
  return "below_average";
}

// 🔹 Years-of-experience from Employment history
async function computeYearsOfExperience(userId) {
  const entries = await listEmployment({ userId });

  if (!entries || entries.length === 0) {
    return null;
  }

  let totalMs = 0;

  for (const job of entries) {
    if (!job.startDate) continue;

    const start = new Date(job.startDate);
    if (Number.isNaN(start.getTime())) continue;

    let end;
    if (job.currentPosition || !job.endDate) {
      end = new Date();
    } else {
      end = new Date(job.endDate);
      if (Number.isNaN(end.getTime())) {
        end = new Date();
      }
    }

    if (end <= start) continue;

    totalMs += end.getTime() - start.getTime();
  }

  if (totalMs <= 0) return null;

  const years = totalMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 10) / 10;
}

function buildRecommendations({
  funnel,
  comparisons,
  skillGaps,
  timeSummary,
  experience,
}) {
  const recs = [];

  if (comparisons.interviewsPerApplication.position === "below_average") {
    recs.push(
      "Your interviews per application are below typical peers. Focus on higher-match roles, warm referrals, and tailoring applications to improve your hit rate."
    );
  }

  if (comparisons.offersPerInterview.position === "below_average") {
    recs.push(
      "Your offers per interview are lower than average. Add more targeted interview prep, mock interviews, and stories that highlight measurable impact."
    );
  }

  if (comparisons.hoursPerWeek.position === "below_average") {
    recs.push(
      "You’re currently investing less time in job search than typical peers. Try reserving 2–3 recurring blocks per week for focused applications and outreach."
    );
  }

  if (skillGaps.coveragePercent < 60) {
    recs.push(
      `Your skills cover about ${skillGaps.coveragePercent}% of the common stack for ${skillGaps.roleKey.toUpperCase()} roles. Prioritize learning: ${skillGaps.missingSkills
        .slice(0, 5)
        .join(", ")}.`
    );
  }

  if (experience.yearsOfExperience == null) {
    recs.push(
      "Add your prior roles to the Employment section so we can better benchmark your experience against typical levels for your target role."
    );
  } else {
    const { yearsOfExperience, benchmarkRange, position } = experience;

    if (position === "below_range") {
      recs.push(
        `You currently have about ${yearsOfExperience} years of experience. For ${experience.roleLevel} roles, most candidates have ${benchmarkRange.min}–${benchmarkRange.max} years. Consider highlighting internships, projects, and impact to compensate for fewer years.`
      );
    } else if (position === "above_range") {
      recs.push(
        `You have around ${yearsOfExperience} years of experience, which is above the typical ${benchmarkRange.min}–${benchmarkRange.max} year range for ${experience.roleLevel} roles. You may be competitive for higher-level roles as well—experiment with some mid/senior applications.`
      );
    }
  }

  recs.push(
    "Clarify your 1–2 sentence value proposition (who you help, how you help them, and what proof you have). Use it consistently on your resume, LinkedIn, and in interviews."
  );

  recs.push(
    "Look for ways to combine your skills into a unique niche (for example: backend + data + domain expertise in a particular industry) to stand out from generalist applicants."
  );

  return recs;
}

// -----------------------------
// Main entry point
// -----------------------------

export async function computeCompetitiveAnalysis(options) {
  const {
    userId,
    targetRole = "swe",
    roleLevel = "entry",
    yearsOfExperience: explicitYOE,
  } = options;

  // 1) Job funnel
  const jobs = await Jobs.find({ userId }).lean();
  const funnel = analyzeJobFunnel(jobs);

  // 2) Time investment
  const timeSummary = await computeTimePerWeek(userId);

  // 3) Skills from Skills page → skill gaps vs standard stack
  const userSkillNames = await fetchUserSkillNames(userId);
  const skillGaps = computeSkillGaps(targetRole, userSkillNames);

  // 4) Years of experience
  let yearsOfExperience =
    typeof explicitYOE === "number"
      ? explicitYOE
      : await computeYearsOfExperience(userId);
  if (yearsOfExperience != null && Number.isNaN(yearsOfExperience)) {
    yearsOfExperience = null;
  }

  const benchmarkRange = getExperienceRangeForLevel(roleLevel);

  let experiencePosition = "unknown";
  if (yearsOfExperience != null && benchmarkRange) {
    if (yearsOfExperience < benchmarkRange.min) experiencePosition = "below_range";
    else if (yearsOfExperience > benchmarkRange.max) experiencePosition = "above_range";
    else experiencePosition = "within_range";
  }

  const experience = {
    yearsOfExperience,
    roleLevel,
    benchmarkRange,
    position: experiencePosition,
  };

  // 5) Comparisons vs benchmarks
  const comparisons = {
    interviewsPerApplication: {
      you: funnel.interviewsPerApplication,
      average: PEER_BENCHMARKS.interviewsPerApplication.average,
      top: PEER_BENCHMARKS.interviewsPerApplication.top,
      position: classifyAgainstBenchmarks(
        funnel.interviewsPerApplication,
        PEER_BENCHMARKS.interviewsPerApplication.average,
        PEER_BENCHMARKS.interviewsPerApplication.top
      ),
    },
    offersPerInterview: {
      you: funnel.offersPerInterview,
      average: PEER_BENCHMARKS.offersPerInterview.average,
      top: PEER_BENCHMARKS.offersPerInterview.top,
      position: classifyAgainstBenchmarks(
        funnel.offersPerInterview,
        PEER_BENCHMARKS.offersPerInterview.average,
        PEER_BENCHMARKS.offersPerInterview.top
      ),
    },
    hoursPerWeek: {
      you: timeSummary.hoursPerWeek,
      average: PEER_BENCHMARKS.hoursPerWeek.average,
      top: PEER_BENCHMARKS.hoursPerWeek.top,
      position: classifyAgainstBenchmarks(
        timeSummary.hoursPerWeek,
        PEER_BENCHMARKS.hoursPerWeek.average,
        PEER_BENCHMARKS.hoursPerWeek.top
      ),
    },
  };

  // 6) Recommendations
  const recommendations = buildRecommendations({
    funnel,
    comparisons,
    skillGaps,
    timeSummary,
    experience,
  });

  // 7) Final result
  return {
    userMetrics: {
      applications: funnel.applications,
      interviews: funnel.interviews,
      offers: funnel.offers,
      interviewsPerApplication: funnel.interviewsPerApplication,
      offersPerInterview: funnel.offersPerInterview,
      timePerWeek: timeSummary.hoursPerWeek,
      timeSummary,
    },
    peerBenchmarks: PEER_BENCHMARKS,
    skillGaps,
    experience,
    comparisons,
    recommendations,
  };
}
