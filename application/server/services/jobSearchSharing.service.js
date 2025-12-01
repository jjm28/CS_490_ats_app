import JobSearchSharingProfile from "../models/JobSharing/JobSearchSharingProfile.js";
import JobSearchGoal from "../models/JobSharing/JobSearchGoal.js";
import JobSearchMilestone from "../models/JobSharing/JobSearchMilestone.js";
import JobSearchGoalProgress from "../models/JobSharing/JobSearchGoalProgress.js";


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

  return milestone;
}