// services/enterprise.service.js
import User from "../models/user.js";
import Profile from "../models/profile.js";

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
