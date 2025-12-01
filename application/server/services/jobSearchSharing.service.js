import JobSearchSharingProfile from "../models/JobSharing/JobSearchSharingProfile.js";
import JobSearchGoal from "../models/JobSharing/JobSearchGoal.js";
import JobSearchMilestone from "../models/JobSharing/JobSearchMilestone.js";
import JobSearchGoalProgress from "../models/JobSharing/JobSearchGoalProgress.js";
import JobSharingEncouragement from "../models/JobSharing/JobSharingEncouragement.js";
import JobSharingEngagement from "../models/JobSharing/JobSharingEngagement.js";

function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekStartUTC(date) {
  const d = startOfDayUTC(date);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday...
  const diffToMonday = (day + 6) % 7; // 0 if Monday, 6 if Sunday
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}


function toDayKey(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


/**
 * Ensure there is a sharing profile for this user.
 * If none exists, create with defaults.
 */
export async function getOrCreateSharingProfile(ownerUserId) {
  let profile = await JobSearchSharingProfile.findOne({ ownerUserId });

  if (!profile) {
    profile = await JobSearchSharingProfile.create({
      ownerUserId,
      // defaults from schema
    });
  }

  return profile;
}

/**
 * Update sharing profile settings (partial update).
 */
export async function updateSharingProfileSettings({
  ownerUserId,
  visibilityMode,
  allowedUserIds,
  blockedUserIds,
  scopes,
  defaultReportFrequency,
}) {
  const profile = await getOrCreateSharingProfile(ownerUserId);

  if (visibilityMode) profile.visibilityMode = visibilityMode;
  if (Array.isArray(allowedUserIds)) profile.allowedUserIds = allowedUserIds;
  if (Array.isArray(blockedUserIds)) profile.blockedUserIds = blockedUserIds;

  if (scopes) {
    profile.scopes = {
      ...(profile.scopes?.toObject ? profile.scopes.toObject() : profile.scopes),
      ...scopes,
    };
  }

  if (defaultReportFrequency) {
    profile.defaultReportFrequency = defaultReportFrequency;
  }

  await profile.save();
  return profile;
}

/**
 * Permission helper – we’ll use this later when exposing progress to other users.
 * For now it's basic and safe.
 */
export async function canViewJobSearchProgress({ ownerUserId, viewerUserId }) {
  // owner can always see their own data
  if (!viewerUserId || viewerUserId === ownerUserId) return true;

  const profile = await getOrCreateSharingProfile(ownerUserId);

  // blocklist wins
  if (profile.blockedUserIds?.includes(viewerUserId)) {
    return false;
  }

  // allowlist wins
  if (profile.allowedUserIds?.includes(viewerUserId)) {
    return true;
  }

  // visibility modes
  if (profile.visibilityMode === "private") {
    return false;
  }

  if (profile.visibilityMode === "partners-only") {
    // later we’ll integrate a dedicated AccountabilityPartner model
    // for now, if not in allowlist, deny
    return false;
  }

  if (profile.visibilityMode === "team") {
    // we'll add PeerGroupMembership check later
    return false;
  }

  if (profile.visibilityMode === "public-link") {
    // token-based logic handled elsewhere; for direct viewerId usage, default false
    return false;
  }

  return false;
}


export async function listJobSearchGoals(ownerUserId) {
  const goals = await JobSearchGoal.find({ ownerUserId }).sort({ createdAt: 1 });
  return goals;
}

export async function createJobSearchGoal({
  ownerUserId,
  title,
  description,
  targetValue,
  unit,
  deadline,
}) {
  if (!title || !targetValue) {
    const err = new Error("Title and targetValue are required");
    err.statusCode = 400;
    throw err;
  }

  const goal = await JobSearchGoal.create({
    ownerUserId,
    title,
    description: description || "",
    targetValue: Number(targetValue),
    currentValue: 0,
    unit: unit || "",
    deadline: deadline ? new Date(deadline) : undefined,
  });

  return goal;
}

export async function addGoalProgress({
  ownerUserId,
  goalId,
  delta,
  note,
}) {
  const increment = Number(delta || 0);
  if (!increment || isNaN(increment)) {
    const err = new Error("delta (number) is required and must be non-zero");
    err.statusCode = 400;
    throw err;
  }

  const goal = await JobSearchGoal.findOne({ _id: goalId, ownerUserId });
  if (!goal) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    throw err;
  }

  const wasCompletedBefore = goal.status === "completed";

  goal.currentValue += increment;

  if (goal.currentValue >= goal.targetValue && goal.status === "active") {
    goal.status = "completed";
  }

  await goal.save();

  const progressEntry = await JobSearchGoalProgress.create({
    ownerUserId,
    goalId,
    delta: increment,
    newValue: goal.currentValue,
    note: note || "",
  });

  // NEW: encouragement when goal becomes completed (only once)
  if (!wasCompletedBefore && goal.status === "completed") {
    const title = goal.title || "your goal";
    await createEncouragementEvent({
      ownerUserId,
      type: "goal_completed",
      targetGoalId: goal._id.toString(),
      message: `You completed your goal: "${title}". Amazing work!`,
    });
  }

  return { goal, progressEntry };
}

/**
 * Auto-increment for "applications" goals when a job is created.
 * Call this from your job creation logic.
 */
export async function incrementApplicationGoalsForUser(ownerUserId, note) {
  const goals = await JobSearchGoal.find({
    ownerUserId,
    status: "active",
  });

  const applicationGoals = goals.filter((g) => {
    const unit = (g.unit || "").toLowerCase().trim();
    return unit === "application" || unit === "applications";
  });

  const results = [];
  for (const goal of applicationGoals) {
    const wasCompletedBefore = goal.status === "completed";

    goal.currentValue += 1;
    if (goal.currentValue >= goal.targetValue && goal.status === "active") {
      goal.status = "completed";
    }
    await goal.save();

    const progressEntry = await JobSearchGoalProgress.create({
      ownerUserId,
      goalId: goal._id.toString(),
      delta: 1,
      newValue: goal.currentValue,
      note: note || "Incremented automatically when a new job was added",
    });

    // encouragement when auto-completion happens
    if (!wasCompletedBefore && goal.status === "completed") {
      const title = goal.title || "your goal";
      await createEncouragementEvent({
        ownerUserId,
        type: "goal_completed",
        targetGoalId: goal._id.toString(),
        message: `You completed your goal: "${title}" by adding applications. Nice work!`,
      });
    }

    results.push({ goal, progressEntry });
  }

  return results;
}


// ---------- MILESTONES ----------

export async function listJobSearchMilestones(ownerUserId) {
  const milestones = await JobSearchMilestone.find({ ownerUserId }).sort({
    achievedAt: -1,
  });
  return milestones;
}

export async function createJobSearchMilestone({
  ownerUserId,
  title,
  description,
  achievedAt,
  relatedJobId,
  type,
}) {
  if (!title) {
    const err = new Error("Title is required for a milestone");
    err.statusCode = 400;
    throw err;
  }

  const milestone = await JobSearchMilestone.create({
    ownerUserId,
    title,
    description: description || "",
    achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
    relatedJobId: relatedJobId || null,
    type: type || null,
  });

  // NEW: encouragement event for milestone
  await createEncouragementEvent({
    ownerUserId,
    type: "milestone_added",
    targetMilestoneId: milestone._id.toString(),
    message: `New milestone: "${title}". Big step forward!`,
  });

  return milestone;
}



function applyScopesToReport(report, scopes) {
  const scoped = { ...report };

  if (!scopes?.shareGoals) {
    scoped.goalsSummary = [];
  }
  if (!scopes?.shareMilestones) {
    scoped.milestones = [];
  }
  if (!scopes?.shareStats) {
    scoped.activitySummary = null;
  }
  // notes are not explicitly in this report yet, but if you add them later
  // you can hide them when !scopes.shareNotes

  return scoped;
}


export async function generateProgressReport({
  ownerUserId,
  viewerUserId,     // optional: null when owner is viewing their own report
  rangeFrom,        // optional ISO string or Date
  rangeTo,          // optional ISO string or Date
}) {
  const now = new Date();

  // default range: last 7 days
  const from = rangeFrom ? new Date(rangeFrom) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = rangeTo ? new Date(rangeTo) : now;

  // 1) Check permissions & get sharing profile
  const profile = await getOrCreateSharingProfile(ownerUserId);

  let scopes = profile.scopes;
  let canView = true;

  if (viewerUserId && viewerUserId !== ownerUserId) {
    // Not the owner – must pass permission check
    canView = await canViewJobSearchProgress({ ownerUserId, viewerUserId });
  }

  if (!canView) {
    const err = new Error("You are not allowed to view this report");
    err.statusCode = 403;
    throw err;
  }

  // 2) Fetch goals & compute summary
  const goals = await JobSearchGoal.find({ ownerUserId }).sort({ createdAt: 1 });

  const goalsSummary = goals.map((g) => {
    const percent =
      g.targetValue > 0
        ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
        : 0;

    return {
      id: g._id.toString(),
      title: g.title,
      description: g.description,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      unit: g.unit,
      status: g.status,
      percent,
    };
  });

  // 3) Fetch recent milestones in range
  const milestones = await JobSearchMilestone.find({
    ownerUserId,
    achievedAt: { $gte: from, $lte: to },
  }).sort({ achievedAt: -1 });

  const milestonesSummary = milestones.map((m) => ({
    id: m._id.toString(),
    title: m.title,
    description: m.description,
    achievedAt: m.achievedAt,
    type: m.type,
    relatedJobId: m.relatedJobId,
  }));

  // 4) Optional: activity summary (if/when you integrate with Jobs/Applications)
  // For now, we can keep this simple or stub it
  const activitySummary = null;
  // Example if you later have a Job collection with createdAt, status, etc:
  // const jobsAdded = await Job.countDocuments({
  //   userId: ownerUserId,
  //   createdAt: { $gte: from, $lte: to },
  // });
  // const activitySummary = { jobsAdded };

  // 5) Compute simple insights
  const completedGoals = goalsSummary.filter((g) => g.status === "completed").length;
  const activeGoals = goalsSummary.filter((g) => g.status === "active").length;
  const insights = [];

  if (completedGoals > 0) {
    insights.push(`You completed ${completedGoals} goal${completedGoals > 1 ? "s" : ""} in this period.`);
  }
  if (activeGoals > 0 && completedGoals === 0) {
    insights.push("You’re actively working on your goals. Keep pushing to complete one this week!");
  }
  if (milestonesSummary.length > 0) {
    insights.push(`You hit ${milestonesSummary.length} milestone${milestonesSummary.length > 1 ? "s" : ""}. Nice work!`);
  }
  if (insights.length === 0) {
    insights.push("This is a quieter period. Consider setting a small, achievable goal to build momentum.");
  }

  const baseReport = {
    generatedAt: now,
    range: {
      from,
      to,
    },
    goalsSummary,
    milestones: milestonesSummary,
    activitySummary,
    insights,
  };

  // 6) Apply scopes if viewer is not the owner
  const effectiveScopes =
    viewerUserId && viewerUserId !== ownerUserId ? scopes : scopes || {};

  const finalReport = applyScopesToReport(baseReport, effectiveScopes);

  return finalReport;
}


export async function createEncouragementEvent({
  ownerUserId,
  sourceUserId = "system",
  type,
  targetGoalId,
  targetMilestoneId,
  message,
}) {
  if (!ownerUserId || !type || !message) {
    const err = new Error("ownerUserId, type and message are required for encouragement");
    err.statusCode = 400;
    throw err;
  }

  const event = await JobSharingEncouragement.create({
    ownerUserId,
    sourceUserId,
    type,
    targetGoalId: targetGoalId || null,
    targetMilestoneId: targetMilestoneId || null,
    message,
  });

  return event;
}

export async function listEncouragementEvents(ownerUserId, limit = 20) {
  const events = await JobSharingEncouragement.find({ ownerUserId })
    .sort({ createdAt: -1 })
    .limit(limit);

  return events;
}


export async function logPartnerEngagement({
  ownerUserId,
  partnerUserId,
  type,
  contextId,
}) {
  if (!ownerUserId || !partnerUserId || !type) {
    const err = new Error("ownerUserId, partnerUserId, and type are required");
    err.statusCode = 400;
    throw err;
  }

  const allowedTypes = [
    "view_progress",
    "view_report",
    "view_milestones",
    "encouragement_reaction",
  ];
  if (!allowedTypes.includes(type)) {
    const err = new Error("Invalid engagement type");
    err.statusCode = 400;
    throw err;
  }

  const event = await JobSharingEngagement.create({
    ownerUserId,
    partnerUserId,
    type,
    contextId: contextId || null,
  });

  return event;
}
export async function getPartnerEngagementSummary({
  ownerUserId,
  sinceDays = 30,
}) {
  const now = new Date();
  const since = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);

  // Get sharing profile to know who the partners are
  const profile = await getOrCreateSharingProfile(ownerUserId);
  const allowedPartners = Array.isArray(profile.allowedUserIds)
    ? profile.allowedUserIds
    : [];

  // Fetch engagement events in the window
  const events = await JobSharingEngagement.find({
    ownerUserId,
    createdAt: { $gte: since, $lte: now },
  });

  // Aggregate per partner in plain JS
  const perPartner = new Map();

  for (const ev of events) {
    const pid = ev.partnerUserId;
    if (!perPartner.has(pid)) {
      perPartner.set(pid, {
        partnerUserId: pid,
        viewsProgress: 0,
        viewsReport: 0,
        viewsMilestones: 0,
        reactions: 0,
        totalEvents: 0,
        lastEngagedAt: null,
      });
    }

    const agg = perPartner.get(pid);
    if (ev.type === "view_progress") agg.viewsProgress += 1;
    if (ev.type === "view_report") agg.viewsReport += 1;
    if (ev.type === "view_milestones") agg.viewsMilestones += 1;
    if (ev.type === "encouragement_reaction") agg.reactions += 1;

    agg.totalEvents += 1;
    if (!agg.lastEngagedAt || ev.createdAt > agg.lastEngagedAt) {
      agg.lastEngagedAt = ev.createdAt;
    }
  }

  // Ensure every allowed partner has an entry (even if no events)
  for (const partnerId of allowedPartners) {
    if (!perPartner.has(partnerId)) {
      perPartner.set(partnerId, {
        partnerUserId: partnerId,
        viewsProgress: 0,
        viewsReport: 0,
        viewsMilestones: 0,
        reactions: 0,
        totalEvents: 0,
        lastEngagedAt: null,
      });
    }
  }

  const partnerSummaries = Array.from(perPartner.values()).map((p) => {
    const engagementScore =
      p.viewsProgress * 1 + p.viewsReport * 2 + p.reactions * 3;

    let engagementLevel = "none";
    if (engagementScore >= 10) engagementLevel = "high";
    else if (engagementScore >= 4) engagementLevel = "moderate";
    else if (engagementScore >= 1) engagementLevel = "low";

    return {
      ...p,
      engagementScore,
      engagementLevel,
    };
  });

  const totalEvents = events.length;
  const engagedPartners = partnerSummaries.filter(
    (p) => p.totalEvents > 0
  ).length;

  // For a simple "effectiveness" hint, count goals completed and milestones added in the same window
  const goalsCompleted = await JobSearchGoal.countDocuments({
    ownerUserId,
    status: "completed",
    updatedAt: { $gte: since, $lte: now },
  });

  const milestonesAdded = await JobSearchMilestone.countDocuments({
    ownerUserId,
    achievedAt: { $gte: since, $lte: now },
  });

  return {
    ownerUserId,
    since,
    until: now,
    totalPartners: allowedPartners.length,
    engagedPartners,
    totalEvents,
    goalsCompleted,
    milestonesAdded,
    partners: partnerSummaries,
  };
}


export async function getMotivationStats({
  ownerUserId,
  viewerUserId,
  sinceDays = 14,
}) {
  const ownerUserIdStr = String(ownerUserId);

  const now = new Date();
  const sinceRaw = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const since = startOfDayUTC(sinceRaw);

  const profile = await getOrCreateSharingProfile(ownerUserIdStr);
  const scopes = profile.scopes || {
    shareGoals: true,
    shareMilestones: true,
    shareStats: true,
    shareNotes: true,
  };

  const isOwner = !viewerUserId || viewerUserId === ownerUserIdStr;
  if (!isOwner && scopes.shareStats === false) {
    const err = new Error("You are not allowed to view motivation stats");
    err.statusCode = 403;
    throw err;
  }

  // --- DAILY ACTIVITY (last N days) ---

  const ownerMatch = {
    $or: [{ ownerUserId: ownerUserIdStr }, { userId: ownerUserIdStr }],
  };

  const progressEntries = await JobSearchGoalProgress.find({
    ...ownerMatch,
    createdAt: { $gte: since, $lte: now },
  });

  const milestones = await JobSearchMilestone.find({
    ...ownerMatch,
    achievedAt: { $gte: since, $lte: now },
  });

  const dailyMap = new Map();

  function ensureDay(dayKey) {
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        dayKey,
        totalActions: 0,
        progressCount: 0,
        milestonesCount: 0,
      });
    }
    return dailyMap.get(dayKey);
  }

  for (const p of progressEntries) {
    const key = toDayKey(p.createdAt);
    const d = ensureDay(key);
    d.totalActions += 1;
    d.progressCount += 1;
  }

  for (const m of milestones) {
    const key = toDayKey(m.achievedAt);
    const d = ensureDay(key);
    d.totalActions += 1;
    d.milestonesCount += 1;
  }

  for (let i = 0; i < sinceDays; i++) {
    const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = toDayKey(day);
    ensureDay(key);
  }

  const dailyActivity = Array.from(dailyMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey)
  );

  // --- STREAKS WINDOW (90 days, same ownerMatch) ---

  const streakWindowDays = 90;
  const streakSince = startOfDayUTC(
    new Date(now.getTime() - streakWindowDays * 24 * 60 * 60 * 1000)
  );

  const streakProgressEntries = await JobSearchGoalProgress.find({
    ...ownerMatch,
    createdAt: { $gte: streakSince, $lte: now },
  });

  const streakMilestones = await JobSearchMilestone.find({
    ...ownerMatch,
    achievedAt: { $gte: streakSince, $lte: now },
  });

  const activeDaysSet = new Set();
  for (const p of streakProgressEntries) {
    activeDaysSet.add(toDayKey(p.createdAt));
  }
  for (const m of streakMilestones) {
    activeDaysSet.add(toDayKey(m.achievedAt));
  }
  // current streak: from today backwards until a gap
  let currentStreak = 0;
  {
    let cursor = new Date(now);
    for (let i = 0; i < streakWindowDays; i++) {
      const key = toDayKey(cursor);
      if (activeDaysSet.has(key)) {
        currentStreak += 1;
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  // longest streak: scan the 90-day window
  let longestStreak = 0;
  {
    let streak = 0;
    for (let i = 0; i < streakWindowDays; i++) {
      const day = new Date(streakSince.getTime() + i * 24 * 60 * 60 * 1000);
      const key = toDayKey(day);
      if (activeDaysSet.has(key)) {
        streak += 1;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }
  }

  // --- goal completion snapshot ---
  const goals = await JobSearchGoal.find({ ownerUserId });

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completionRate =
    totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // --- motivational messages ---
  const messages = [];

  if (currentStreak > 0) {
    messages.push(
      `You're on a ${currentStreak}-day activity streak. Keep it going!`
    );
  } else {
    messages.push("You don't have an active streak yet. Take one small action today to start one.");
  }

  if (completedGoals > 0) {
    messages.push(
      `You've completed ${completedGoals} goal${
        completedGoals === 1 ? "" : "s"
      } so far. Nice momentum.`
    );
  } else if (totalGoals > 0) {
    messages.push(
      `You have ${activeGoals} active goal${
        activeGoals === 1 ? "" : "s"
      }. Focus on one and make a small update.`
    );
  }

  const totalActionsInWindow = dailyActivity.reduce(
    (sum, d) => sum + d.totalActions,
    0
  );
  if (totalActionsInWindow === 0) {
    messages.push(
      `It's been a quiet last ${sinceDays} day${
        sinceDays === 1 ? "" : "s"
      }. Even one action can restart your momentum.`
    );
  } else if (totalActionsInWindow >= sinceDays) {
    messages.push(
      `You're averaging at least one job search action per day in this window. That's strong consistency.`
    );
  }

  return {
    ownerUserId,
    since,
    until: now,
    sinceDays,
    dailyActivity,
    currentStreak,
    longestStreak,
    totalGoals,
    activeGoals,
    completedGoals,
    completionRate,
    messages,
  };
}


export async function getAccountabilityInsights({
  ownerUserId,
  sinceWeeks = 8,
}) {
  const ownerUserIdStr = String(ownerUserId);

  const now = new Date();
  const windowDays = sinceWeeks * 7;
  const windowStartRaw = new Date(
    now.getTime() - windowDays * 24 * 60 * 60 * 1000
  );
  const windowStart = startOfDayUTC(windowStartRaw);

  const highEngagementThreshold = 3; // events per week to count as "high"

  // match owner (some of your models use ownerUserId, some userId)
  const ownerMatch = {
    $or: [{ ownerUserId: ownerUserIdStr }, { userId: ownerUserIdStr }],
  };

  // --- Fetch data in window ---

  const [engagementEvents, progressEntries, milestones, completedGoals] =
    await Promise.all([
      JobSharingEngagement.find({
        ownerUserId: ownerUserIdStr,
        createdAt: { $gte: windowStart, $lte: now },
      }),
      JobSearchGoalProgress.find({
        ...ownerMatch,
        createdAt: { $gte: windowStart, $lte: now },
      }),
      JobSearchMilestone.find({
        ...ownerMatch,
        achievedAt: { $gte: windowStart, $lte: now },
      }),
      JobSearchGoal.find({
        ownerUserId: ownerUserIdStr,
        status: "completed",
        updatedAt: { $gte: windowStart, $lte: now },
      }),
    ]);

  // --- Build weekly buckets ---

  const weeklyMap = new Map();

  function ensureWeek(weekKey) {
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        weekKey,
        weekStart: weekKey,
        engagementEvents: 0,
        actionCount: 0,
        goalsCompleted: 0,
      });
    }
    return weeklyMap.get(weekKey);
  }

  // Fill empty weeks in range
  for (let i = 0; i < sinceWeeks; i++) {
    const d = new Date(windowStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = getWeekStartUTC(d);
    const key = toDayKey(weekStart);
    ensureWeek(key);
  }

  // Engagement per week
  for (const ev of engagementEvents) {
    const weekStart = getWeekStartUTC(ev.createdAt);
    const key = toDayKey(weekStart);
    const bucket = ensureWeek(key);
    bucket.engagementEvents += 1;
  }

  // Activity (progress + milestones) per week
  for (const p of progressEntries) {
    const weekStart = getWeekStartUTC(p.createdAt);
    const key = toDayKey(weekStart);
    const bucket = ensureWeek(key);
    bucket.actionCount += 1;
  }

  for (const m of milestones) {
    const weekStart = getWeekStartUTC(m.achievedAt);
    const key = toDayKey(weekStart);
    const bucket = ensureWeek(key);
    bucket.actionCount += 1;
  }

  // Goals completed per week
  for (const g of completedGoals) {
    const weekStart = getWeekStartUTC(g.updatedAt || g.completedAt || g.createdAt);
    const key = toDayKey(weekStart);
    const bucket = ensureWeek(key);
    bucket.goalsCompleted += 1;
  }

  const weekly = Array.from(weeklyMap.values()).sort((a, b) =>
    a.weekKey.localeCompare(b.weekKey)
  );

  // --- Split into high-engagement vs no-engagement weeks ---

  const highWeeks = weekly.filter(
    (w) => w.engagementEvents >= highEngagementThreshold
  );
  const zeroWeeks = weekly.filter((w) => w.engagementEvents === 0);

  function avg(arr, prop) {
    if (!arr.length) return 0;
    const sum = arr.reduce((s, x) => s + (x[prop] || 0), 0);
    return sum / arr.length;
  }

  const avgActionsHigh = avg(highWeeks, "actionCount");
  const avgActionsZero = avg(zeroWeeks, "actionCount");
  const avgGoalsHigh = avg(highWeeks, "goalsCompleted");
  const avgGoalsZero = avg(zeroWeeks, "goalsCompleted");

  const totalEngagementEvents = engagementEvents.length;
  const totalActions = weekly.reduce((s, w) => s + w.actionCount, 0);
  const totalGoalsCompleted = weekly.reduce(
    (s, w) => s + w.goalsCompleted,
    0
  );

  // --- Partner engagement summary (reuse existing service) ---

  let topPartners = [];
  try {
    const partnerSummary = await getPartnerEngagementSummary({
      ownerUserId: ownerUserIdStr,
      sinceDays: windowDays,
    });

    topPartners = partnerSummary.partners
      .filter((p) => p.engagementScore > 0)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3)
      .map((p) => ({
        partnerUserId: p.partnerUserId,
        engagementLevel: p.engagementLevel,
        totalEvents: p.totalEvents,
      }));
  } catch (e) {
    console.error("Error computing top partners for insights:", e);
  }

  // --- Generate headline + insights + suggestions (rule-based) ---

  let headline = "Accountability impact overview";
  const insights = [];
  const suggestions = [];

  if (totalEngagementEvents === 0) {
    headline = "No partner engagement in this period";
    insights.push(
      `In the last ${sinceWeeks} week${
        sinceWeeks === 1 ? "" : "s"
      }, there were no logged engagement events from accountability partners.`
    );
    if (totalActions > 0) {
      insights.push(
        `You still completed ${totalActions} job search action${
          totalActions === 1 ? "" : "s"
        } and ${totalGoalsCompleted} goal${
          totalGoalsCompleted === 1 ? "" : "s"
        } without partner engagement.`
      );
    }
    suggestions.push(
      "Consider sending a progress report to your partners or explicitly asking them to check in on your goals.",
      "You could invite a trusted friend or mentor to become an accountability partner and share this dashboard."
    );
  } else {
    if (highWeeks.length > 0 && zeroWeeks.length > 0) {
      // Compare high vs zero
      const ratioActions =
        avgActionsZero > 0 ? avgActionsHigh / avgActionsZero : null;
      const ratioGoals =
        avgGoalsZero > 0 ? avgGoalsHigh / avgGoalsZero : null;

      if (ratioActions && ratioActions >= 1.5) {
        headline = "Accountability is boosting your activity";
        insights.push(
          `In weeks with at least ${highEngagementThreshold} partner engagement events, you average about ${avgActionsHigh.toFixed(
            1
          )} job search actions per week, compared to ${avgActionsZero.toFixed(
            1
          )} in weeks with no engagement.`
        );
      } else {
        headline = "Accountability has a mixed impact so far";
        insights.push(
          `Your average weekly activity is ${avgActionsHigh.toFixed(
            1
          )} actions in higher-engagement weeks versus ${avgActionsZero.toFixed(
            1
          )} actions in weeks with no engagement.`
        );
      }

      if (avgGoalsHigh > avgGoalsZero) {
        insights.push(
          `Goal completion also trends higher in engaged weeks: ${avgGoalsHigh.toFixed(
            2
          )} goals completed per week vs ${avgGoalsZero.toFixed(
            2
          )} in no-engagement weeks.`
        );
      }
    } else if (highWeeks.length > 0) {
      headline = "You have consistent accountability support";
      insights.push(
        `You have ${highWeeks.length} high-engagement week${
          highWeeks.length === 1 ? "" : "s"
        } in the last ${sinceWeeks} week${
          sinceWeeks === 1 ? "" : "s"
        }, with an average of ${avgActionsHigh.toFixed(
          1
        )} actions and ${avgGoalsHigh.toFixed(
          2
        )} goal completions per week in those weeks.`
      );
    } else {
      headline = "Light but regular partner engagement";
      insights.push(
        `Partners have engaged ${totalEngagementEvents} time${
          totalEngagementEvents === 1 ? "" : "s"
        } in the last ${sinceWeeks} weeks, but not enough in any single week to be classified as “high engagement.”`
      );
    }

    if (zeroWeeks.length > 0) {
      suggestions.push(
        `You had ${zeroWeeks.length} week${
          zeroWeeks.length === 1 ? "" : "s"
        } with no partner engagement. Consider sending a quick update or report at the start of those weeks to trigger support.`
      );
    }

    if (highWeeks.length > 0) {
      suggestions.push(
        "Look at what was happening in your high-engagement weeks (timing of check-ins, messages, or deadlines) and try to repeat those patterns."
      );
    }
  }

  if (topPartners.length > 0) {
    const namesOrIds = topPartners
      .map((p) => p.partnerUserId)
      .join(", ");
    insights.push(
      `Your most engaged partners in this period are: ${namesOrIds}.`
    );
    suggestions.push(
      "Consider scheduling a regular check-in with your most engaged partners to maintain momentum."
    );
  }

  const summaryForAi = `Owner ${ownerUserIdStr} over last ${sinceWeeks} weeks: total engagement events=${totalEngagementEvents}, total actions=${totalActions}, total goals completed=${totalGoalsCompleted}. High-engagement weeks=${highWeeks.length}, no-engagement weeks=${zeroWeeks.length}, avgActionsHigh=${avgActionsHigh.toFixed(
    2
  )}, avgActionsZero=${avgActionsZero.toFixed(
    2
  )}, avgGoalsHigh=${avgGoalsHigh.toFixed(
    2
  )}, avgGoalsZero=${avgGoalsZero.toFixed(2)}. Top partners=${topPartners
    .map((p) => `${p.partnerUserId}(${p.totalEvents} events)`)
    .join(", ")}.`;

  return {
    ownerUserId: ownerUserIdStr,
    since: windowStart,
    until: now,
    sinceWeeks,
    highEngagementDefinition: {
      minEventsPerWeek: highEngagementThreshold,
    },
    weekly,
    stats: {
      totalEngagementEvents,
      totalActions,
      totalGoalsCompleted,
      highEngagementWeeks: highWeeks.length,
      zeroEngagementWeeks: zeroWeeks.length,
      avgActionsHigh,
      avgActionsZero,
      avgGoalsHigh,
      avgGoalsZero,
    },
    topPartners,
    headline,
    insights,
    suggestions,
    summaryForAi, // <-- easy hook for future AI analysis
  };
}
