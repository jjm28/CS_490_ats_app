import JobSearchSharingProfile from "../models/JobSharing/JobSearchSharingProfile.js";
import JobSearchGoal from "../models/JobSharing/JobSearchGoal.js";
import JobSearchMilestone from "../models/JobSharing/JobSearchMilestone.js";
import JobSearchGoalProgress from "../models/JobSharing/JobSearchGoalProgress.js";
import JobSharingEncouragement from "../models/JobSharing/JobSharingEncouragement.js";
import JobSharingEngagement from "../models/JobSharing/JobSharingEngagement.js";


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
