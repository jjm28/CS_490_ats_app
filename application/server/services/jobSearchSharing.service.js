import JobSearchSharingProfile from "../models/JobSharing/JobSearchSharingProfile.js";



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
