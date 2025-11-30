// services/productivity.service.js
import ActivitySession from "../models/activitySession.js";
import Jobs from "../models/jobs.js";

/**
 * Start a new activity session
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.activityType - "job_search" | "job_research" | "resume_edit" | "coverletter_edit"
 * @param {string} [params.jobId]
 * @param {string} [params.context]
 * @param {number} [params.energyLevelStart]
 */
export async function startActivitySession({
  userId,
  activityType,
  jobId,
  context,
  energyLevelStart,
}) {
  const doc = await ActivitySession.create({
    userId,
    activityType,
    jobId: jobId || null,
    context: context || null,
    startedAt: new Date(),
    energyLevelStart: energyLevelStart ?? null,
  });

  return doc.toObject();
}

/**
 * End an existing activity session
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.sessionId
 * @param {number} [params.energyLevelEnd]
 */
export async function endActivitySession({
  userId,
  sessionId,
  energyLevelEnd,
}) {
  const session = await ActivitySession.findOne({ _id: sessionId, userId });

  if (!session) {
    return null;
  }

  if (session.endedAt) {
    // Already ended – just return it
    return session.toObject();
  }

  const endedAt = new Date();
  const durationMinutes = Math.max(
    0,
    Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000)
  );

  session.endedAt = endedAt;
  session.durationMinutes = durationMinutes;
  if (energyLevelEnd !== undefined) {
    session.energyLevelEnd = energyLevelEnd;
  }

  await session.save();
  return session.toObject();
}

/**
 * Compute productivity overview for a user
 * This is what your frontend "Productivity Dashboard" will consume.
 * @param {string} userId
 */
export async function computeProductivityOverview(userId) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Pull last ~30 days of sessions
  const sessions = await ActivitySession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  }).lean();

  // If no data, return a safe placeholder
  if (!sessions || sessions.length === 0) {
    return {
      summary: {
        totalMinutes: 0,
        totalHours: 0,
        periodDays: 30,
      },
      activityBreakdown: [],
      schedulePatterns: {
        byDayOfWeek: [],
        byHourOfDay: [],
        bestWindows: [],
      },
      outcomes: {
        applicationsPerHour: 0,
        interviewsPerHour: 0,
        offersPerHour: 0,
        totalApplications: 0,
        totalInterviews: 0,
        totalOffers: 0,
      },
      wellbeing: {
        avgMinutesPerDay: 0,
        weeklyHoursEstimate: 0,
        highLoadDays: 0,
        burnoutRisk: "low",
      },
      energyCorrelation: {
        overallAverage: null,
        byActivityType: [],
        byTimeOfDay: [],
      },
      recommendations: [
        "Once you start logging time on your job search activities, you'll see personalized productivity insights here.",
      ],
    };
  }

  // Helper
  const safeDuration = (s) =>
    s.durationMinutes ??
    Math.max(
      0,
      Math.round(
        ((s.endedAt ? new Date(s.endedAt) : now).getTime() -
          new Date(s.startedAt).getTime()) /
          60000
      )
    );

  // -----------------------------
  // 1) Summary and breakdown
  // -----------------------------
  let totalMinutes = 0;
  const byActivity = {};

  const byDayOfWeek = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };

  const byHourOfDay = new Array(24).fill(0);

  const energySum = { total: 0, count: 0 };
  const energyByActivity = {};
  const energyByTimeOfDay = new Array(24).fill(null).map(() => ({
    total: 0,
    count: 0,
  }));

  const dailyTotalsMap = new Map(); // "YYYY-MM-DD" -> minutes

  for (const s of sessions) {
    const dur = safeDuration(s);
    totalMinutes += dur;

    // Activity breakdown
    const type = s.activityType || "unknown";
    if (!byActivity[type]) {
      byActivity[type] = 0;
    }
    byActivity[type] += dur;

    // Day of week
    const startDate = new Date(s.startedAt);
    const dayIdx = startDate.getDay(); // 0–6
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayLabel = dayLabels[dayIdx];
    byDayOfWeek[dayLabel] += dur;

    // Hour of day (start hour as approximation)
    const hour = startDate.getHours(); // 0–23
    byHourOfDay[hour] += dur;

    // Daily totals for burnout-ish checks
    const dayKey = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
    dailyTotalsMap.set(dayKey, (dailyTotalsMap.get(dayKey) || 0) + dur);

    // Energy correlations
    const energyStart = s.energyLevelStart;
    const energyEnd = s.energyLevelEnd;
    const energy =
      typeof energyEnd === "number"
        ? energyEnd
        : typeof energyStart === "number"
        ? energyStart
        : null;

    if (typeof energy === "number") {
      energySum.total += energy;
      energySum.count += 1;

      if (!energyByActivity[type]) {
        energyByActivity[type] = { total: 0, count: 0 };
      }
      energyByActivity[type].total += energy;
      energyByActivity[type].count += 1;

      energyByTimeOfDay[hour].total += energy;
      energyByTimeOfDay[hour].count += 1;
    }
  }

  const activityBreakdown = Object.entries(byActivity).map(
    ([activityType, minutes]) => ({
      activityType,
      minutes,
      hours: +(minutes / 60).toFixed(1),
      percent: totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0,
    })
  );

  const schedulePatterns = {
    byDayOfWeek: Object.entries(byDayOfWeek).map(([day, minutes]) => ({
      day,
      minutes,
      hours: +(minutes / 60).toFixed(1),
    })),
    byHourOfDay: byHourOfDay.map((minutes, hour) => ({
      hour,
      minutes,
      hours: +(minutes / 60).toFixed(2),
    })),
    bestWindows: [],
  };

  // Best windows: top 2–3 hours with most minutes
  const sortedHours = schedulePatterns.byHourOfDay
    .slice()
    .sort((a, b) => b.minutes - a.minutes)
    .filter((h) => h.minutes > 0)
    .slice(0, 3);
  schedulePatterns.bestWindows = sortedHours.map((h) => ({
    hour: h.hour,
    label: `${String(h.hour).padStart(2, "0")}:00`,
    minutes: h.minutes,
  }));

  // -----------------------------
  // 2) Outcomes vs time spent
  // -----------------------------
  const jobs = await Jobs.find({ userId }).lean();
  let applications = 0;
  let interviews = 0;
  let offers = 0;

  for (const job of jobs) {
    const hist = job.statusHistory || [];
    if (hist.some((h) => h.status === "applied")) applications++;
    if (hist.some((h) => h.status === "interview")) interviews++;
    if (hist.some((h) => h.status === "offer")) offers++;
  }

  const totalHours = totalMinutes / 60 || 0.0001; // avoid divide-by-zero
  const outcomes = {
    applicationsPerHour: +(applications / totalHours).toFixed(2),
    interviewsPerHour: +(interviews / totalHours).toFixed(2),
    offersPerHour: +(offers / totalHours).toFixed(2),
    totalApplications: applications,
    totalInterviews: interviews,
    totalOffers: offers,
  };

  // -----------------------------
  // 3) Wellbeing / burnout-ish
  // -----------------------------
  const distinctDays = dailyTotalsMap.size || 1;
  const avgMinutesPerDay = totalMinutes / distinctDays;
  const weeklyHoursEstimate = (avgMinutesPerDay * 7) / 60;

  const HIGH_LOAD_MINUTES = 5 * 60; // 5+ hours in a day
  let highLoadDays = 0;
  for (const minutes of dailyTotalsMap.values()) {
    if (minutes >= HIGH_LOAD_MINUTES) highLoadDays++;
  }

  let burnoutRisk = "low";
  if (weeklyHoursEstimate > 20 || highLoadDays >= 3) {
    burnoutRisk = "medium";
  }
  if (weeklyHoursEstimate > 30 || highLoadDays >= 5) {
    burnoutRisk = "high";
  }

  const wellbeing = {
    avgMinutesPerDay: Math.round(avgMinutesPerDay),
    weeklyHoursEstimate: +weeklyHoursEstimate.toFixed(1),
    highLoadDays,
    burnoutRisk,
  };

  // -----------------------------
  // 4) Energy correlations
  // -----------------------------
  const overallAverage =
    energySum.count > 0
      ? +(energySum.total / energySum.count).toFixed(2)
      : null;

  const byActivityType = Object.entries(energyByActivity).map(
    ([activityType, agg]) => ({
      activityType,
      averageEnergy: +(agg.total / agg.count).toFixed(2),
    })
  );

  const byTimeOfDay = energyByTimeOfDay.map((agg, hour) => ({
    hour,
    averageEnergy:
      agg.count > 0 ? +(agg.total / agg.count).toFixed(2) : null,
  }));

  const energyCorrelation = {
    overallAverage,
    byActivityType,
    byTimeOfDay,
  };

  // -----------------------------
  // 5) Recommendations
  // -----------------------------
  const recommendations = [];

  // Time allocation hints
  const search = activityBreakdown.find((a) => a.activityType === "job_search");
  const research = activityBreakdown.find(
    (a) => a.activityType === "job_research"
  );
  const resume = activityBreakdown.find(
    (a) => a.activityType === "resume_edit"
  );
  const cover = activityBreakdown.find(
    (a) => a.activityType === "coverletter_edit"
  );

  if (search && search.percent > 60) {
    recommendations.push(
      "You’re spending a large share of your time on job searching. Consider shifting some of that time into tailored applications and prep for high-match roles."
    );
  }

  if (resume && resume.percent > 40) {
    recommendations.push(
      "You’re investing heavily in resume editing. Try saving reusable templates and focusing edits on impact bullets instead of layout tweaks."
    );
  }

  if (overallAverage !== null && overallAverage < 3) {
    recommendations.push(
      "Your average energy level during job search sessions is on the low side. Experiment with shorter, focused sprints and schedule sessions at higher-energy times of day."
    );
  }

  if (burnoutRisk === "high") {
    recommendations.push(
      "Your weekly job search time is quite high. Consider setting hard daily/weekly limits and blocking off recovery time to prevent burnout."
    );
  } else if (burnoutRisk === "medium") {
    recommendations.push(
      "You’re putting in solid time on your job search. Make sure you have at least one or two lighter days per week to recharge."
    );
  }

  if (schedulePatterns.bestWindows.length > 0) {
    const best = schedulePatterns.bestWindows[0];
    recommendations.push(
      `You do the most focused work around ${String(best.hour).padStart(
        2,
        "0"
      )}:00. Try protecting this time on your calendar for deep job-search tasks.`
    );
  }

  // Outcome efficiency hints (very rough)
  if (outcomes.applicationsPerHour < 1 && applications > 0) {
    recommendations.push(
      "Your applications per hour are relatively low. Consider batching similar applications and using checklists to speed up your process while staying accurate."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Keep logging your job search sessions. As more data accumulates, you’ll receive more specific productivity and balance recommendations."
    );
  }

  return {
    summary: {
      totalMinutes,
      totalHours: +totalHours.toFixed(1),
      periodDays: 30,
    },
    activityBreakdown,
    schedulePatterns,
    outcomes,
    wellbeing,
    energyCorrelation,
    recommendations,
  };
}
