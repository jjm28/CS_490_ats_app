// services/enterprise.service.js
import User from "../models/user.js";
import Profile from "../models/profile.js";
import CohortMember from "../models/Cohort/CohortMember.js";

export async function searchJobSeekers({
  organizationId,
  search,
  page = 1,
  pageSize = 10,
}) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.statusCode = 400;
    throw error;
  }

  const skip = (page - 1) * pageSize;

  // base query: job seekers in this org
  const userQuery = {
    role: "job_seeker",
    organizationId,
  };

  // run user query first
  const users = await User.find(userQuery)
    .select("_id email role organizationId")
    .lean();

  const userIds = users.map((u) => u._id.toString());

  if (!userIds.length) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const profileQuery = { userId: { $in: userIds } };
  // optional text filter
  if (search && search.trim()) {
    const s = search.trim();
    profileQuery.$or = [
      { fullName: { $regex: s, $options: "i" } },
      { headline: { $regex: s, $options: "i" } },
    ];
  }

  const total = await Profile.countDocuments(profileQuery);

  const profiles = await Profile.find(profileQuery)
    .sort({ fullName: 1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  const usersById = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  const items = profiles.map((p) => {
    const user = usersById[p.userId];
    if (!user) return null;

    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: p.fullName || "",
      headline: p.headline || "",
    };
  }).filter(Boolean);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listJobSeekersForOrg({
  organizationId,
  search,
  includeDeleted = false,
  page = 1,
  pageSize = 20,
}) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.statusCode = 400;
    throw error;
  }

  const skip = (page - 1) * pageSize;

  const userQuery = {
    organizationId,
    role: "job_seeker",
  };

  if (!includeDeleted) {
    userQuery.isDeleted = false;
  }

  const [users, total] = await Promise.all([
    User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    User.countDocuments(userQuery),
  ]);

  const userIds = users.map((u) => u._id.toString());

  let profilesByUserId = {};
  let cohortsCountByUserId = {};

  if (userIds.length) {
    const [profiles, cohortMembers] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }).lean(),
      CohortMember.aggregate([
        { $match: { jobSeekerUserId: { $in: userIds } } },
        {
          $group: {
            _id: "$jobSeekerUserId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    profilesByUserId = profiles.reduce((acc, p) => {
      acc[p.userId] = p;
      return acc;
    }, {});

    cohortsCountByUserId = cohortMembers.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
  }

  const items = users
    .map((u) => {
      const profile = profilesByUserId[u._id.toString()];
      const fullName =
        profile?.fullName ||
        [u.firstName, u.lastName].filter(Boolean).join(" ");

      if (search && search.trim()) {
        const s = search.toLowerCase();
        const hit =
          (fullName || "").toLowerCase().includes(s) ||
          (u.email || "").toLowerCase().includes(s);
        if (!hit) return null;
      }

      return {
        _id: u._id.toString(),
        email: u.email,
        fullName: fullName || "",
        isDeleted: !!u.isDeleted,
        createdAt: u.createdAt,
        cohortsCount: cohortsCountByUserId[u._id.toString()] || 0,
      };
    })
    .filter(Boolean);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function bulkUpdateJobSeekerDeletion({
  organizationId,
  userIds,
  isDeleted,
}) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.statusCode = 400;
    throw error;
  }
  if (!userIds || !userIds.length) {
    return { updated: 0 };
  }

  const res = await User.updateMany(
    {
      _id: { $in: userIds },
      organizationId,
      role: "job_seeker",
    },
    { $set: { isDeleted } }
  );

  return { updated: res.modifiedCount || 0 };
}

export async function bulkAddJobSeekersToCohort({
  organizationId,
  userIds,
  cohortId,
  addMembersToCohortFn,
}) {
  if (!organizationId || !userIds || !userIds.length || !cohortId) {
    const error = new Error("organizationId, cohortId and userIds are required");
    error.statusCode = 400;
    throw error;
  }

  const { memberCount } = await addMembersToCohortFn({
    cohortId,
    organizationId,
    jobSeekerUserIds: userIds,
    source: "admin_bulk",
  });

  return { memberCount };
}



