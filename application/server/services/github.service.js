import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import 'dotenv/config';
import { Octokit } from 'octokit';
/*
  fakeUserStore.set("user-123", {
    githubAccessToken: "gho_...",
    githubLogin: "octocat",
  });
*/

// Helper to load/save user GitHub info
export async function getUserRecord(appUserId) {
  const db = getDb();
  const userstore = db.collection('usergithubrecord');
  let usergitrecord = await userstore.findOne({ userid: appUserId})

    if (!usergitrecord) {
                    const doc = {
                        userid: appUserId,
                        githubAccess: {}
                        }
                        await  userstore.insertOne(doc)
                        usergitrecord =  doc
     }
  return usergitrecord;
}



export async function updateUserRecord(appUserId, data = {}) {
  const db = getDb();
  const userstore = db.collection("usergithubrecord");
try {
  // 1. Try to find existing record
  let existing = await userstore.findOne({ userid: appUserId });

  // 2. If no record exists, create a new one
  if (!existing) {
    const newDoc = {
      userid: appUserId,
      githubAccess: data,             // store the GitHub fields directly
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userstore.insertOne(newDoc);
    return newDoc;
  }

  // 3. Prepare only the fields you want updated
  const updatedFields = {
    githubAccess: data,              // githubAccessToken, githubLogin, githubId
    updatedAt: new Date(),
  };

  // 4. Update the record safely
  const updated = await userstore.updateOne(
    { userid: appUserId },
    { $set: updatedFields }
  );
  console.log(updated)
}
catch (err){
    console.log("Error upating user record: ",err)
}

}


// Normalize a GitHub repo into our internal schema
function normalizeGitHubRepo(appUserId, repo) {
  return {
    userId: appUserId,
    githubRepoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description ?? null,
    language: repo.language ?? null,
    stargazersCount: repo.stargazers_count ?? 0,
    forksCount: repo.forks_count ?? 0,
    updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    isPrivate: !!repo.private,
    // reserved for later phases:
    // isFeatured: false,
    // linkedSkillIds: [],
    lastSyncedAt: new Date(),
    updatedAtDoc: new Date(), // separate from repo.updatedAt
  };
}

// Upsert all repos for a given user into usergithubrepos
export async function upsertUserRepos(appUserId, reposFromGitHub = []) {
  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  const githubIds = [];
  for (const repo of reposFromGitHub) {
    const doc = normalizeGitHubRepo(appUserId, repo);
    githubIds.push(repo.id);

    await repoStore.updateOne(
      { userId: appUserId, githubRepoId: repo.id },
      {
        $set: {
          name: doc.name,
          fullName: doc.fullName,
          htmlUrl: doc.htmlUrl,
          description: doc.description,
          language: doc.language,
          stargazersCount: doc.stargazersCount,
          forksCount: doc.forksCount,
          updatedAt: doc.updatedAt,
          isPrivate: doc.isPrivate,
          lastSyncedAt: doc.lastSyncedAt,
          updatedAtDoc: doc.updatedAtDoc,
        },
        $setOnInsert: {
          userId: doc.userId,
          githubRepoId: doc.githubRepoId,
          createdAt: new Date(),
          isFeatured: false,
          linkedSkillIds: [],     // store skill IDs as strings
        },
      },
      { upsert: true }
    );
  }

  if (githubIds.length > 0) {
    await repoStore.deleteMany({
      userId: appUserId,
      githubRepoId: { $nin: githubIds },
    });
  }

  const userstore = db.collection("usergithubrecord");
  await userstore.updateOne(
    { userid: appUserId },
    { $set: { lastReposSyncedAt: new Date() } }
  );
}

// Get repos for a user from snapshot, sorted by GitHub's updated date
export async function getUserRepos(appUserId) {
  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  const repos = await repoStore
    .find({ userId: appUserId })
    .sort({ updatedAt: -1 })
    .toArray();

  return repos;
}

// High-level sync: fetch from GitHub + upsert into DB
export async function syncReposForUser(appUserId) {
  const db = getDb();

  // Get token from usergithubrecord
  const record = await getUserRecord(appUserId);
  const accessToken = record?.githubAccess?.githubAccessToken;

  if (!accessToken) {
    const error = new Error("GitHub not connected for this user");
    error.code = "NO_GITHUB_TOKEN";
    throw error;
  }

  const octokit = new Octokit({ auth: accessToken });

  // Only public repos for now (matches your current behavior)
  const reposFromGitHub = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    {
      per_page: 100,
      visibility: "public",
      sort: "updated",
    }
  );

  await upsertUserRepos(appUserId, reposFromGitHub);
  return reposFromGitHub;
}



// Get all repos for manage view
export async function getUserReposForManage(appUserId) {
  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  const repos = await repoStore
    .find({ userId: appUserId })
    .sort({ updatedAt: -1 })
    .toArray();

  return repos;
}

// Get only featured repos (and exclude private ones from public display)
export async function getFeaturedRepos(appUserId) {
  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  const repos = await repoStore
    .find({
      userId: appUserId,
      isFeatured: true,
      isPrivate: { $ne: true },
    })
    .sort({ updatedAt: -1 })
    .toArray();

  return repos;
}

// Update which repos are featured (enforce a max)
export async function updateFeaturedRepos(appUserId, featuredRepoIds = []) {
  const MAX_FEATURED = 6;
  const trimmedIds = Array.from(new Set(featuredRepoIds)).slice(0, MAX_FEATURED);

  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  // set all to false
  await repoStore.updateMany(
    { userId: appUserId },
    { $set: { isFeatured: false } }
  );

  if (trimmedIds.length === 0) return;

  // set selected to true
  await repoStore.updateMany(
    { userId: appUserId, githubRepoId: { $in: trimmedIds } },
    { $set: { isFeatured: true } }
  );
}

// Update linked skills for a single repo
export async function updateRepoSkills(appUserId, githubRepoId, skillIds = []) {
  const db = getDb();
  const repoStore = db.collection("usergithubrepos");

  const normalized = Array.from(
    new Set(
      (skillIds || [])
        .map(String)
        .filter((id) => id && id.trim().length > 0)
    )
  );

  await repoStore.updateOne(
    { userId: appUserId, githubRepoId },
    {
      $set: {
        linkedSkillIds: normalized,
        updatedAtDoc: new Date(),
      },
    }
  );
}

// ───────────────────────────────────────────────
// GitHub Activity (Phase 4)
// ───────────────────────────────────────────────

function get90DaysAgoDate() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d;
}

// Normalize a date to the start of its week (Mon 00:00)
function weekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get up to 12 week buckets ending at current week
function buildEmptyWeeklyBuckets() {
  const buckets = [];
  const now = new Date();
  const currentWeekStart = weekStart(now);
  for (let i = 11; i >= 0; i--) {
    const w = new Date(currentWeekStart);
    w.setDate(w.getDate() - i * 7);
    buckets.push({
      weekStart: w,
      commitCount: 0,
    });
  }
  return buckets;
}

// Read cached activity snapshot
export async function getActivitySnapshot(appUserId) {
  const db = getDb();
  const col = db.collection("githubactivity");

  const doc = await col.findOne({ userId: appUserId });
  if (!doc) {
    return null;
  }

  return {
    userId: doc.userId,
    totalCommitsLast90Days: doc.totalCommitsLast90Days || 0,
    featuredRepoCount: doc.featuredRepoCount || 0,
    activeWeeksLast12: doc.activeWeeksLast12 || 0,
    weeklyBuckets: (doc.weeklyBuckets || []).map((b) => ({
      weekStart: b.weekStart instanceof Date ? b.weekStart.toISOString() : b.weekStart,
      commitCount: b.commitCount || 0,
    })),
    lastActivitySyncedAt: doc.lastActivitySyncedAt
      ? doc.lastActivitySyncedAt.toISOString()
      : null,
  };
}

// Sync activity for user based on featured repos
export async function syncActivityForUser(appUserId) {
  const db = getDb();
  const activityCol = db.collection("githubactivity");

  // Need user token + login
  const userRecord = await getUserRecord(appUserId);
  const accessToken = userRecord?.githubAccess?.githubAccessToken;
  const githubLogin = userRecord?.githubAccess?.githubLogin;

  if (!accessToken || !githubLogin) {
    const err = new Error("GitHub not connected for this user");
    err.code = "NO_GITHUB_TOKEN";
    throw err;
  }

  const octokit = new Octokit({ auth: accessToken });

  // Load featured repos from snapshot
  const featuredRepos = await getFeaturedRepos(appUserId);
  if (!featuredRepos || featuredRepos.length === 0) {
    // upsert empty activity doc
    const emptyBuckets = buildEmptyWeeklyBuckets();
    const doc = {
      userId: appUserId,
      totalCommitsLast90Days: 0,
      featuredRepoCount: 0,
      activeWeeksLast12: 0,
      weeklyBuckets: emptyBuckets,
      lastActivitySyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await activityCol.updateOne(
      { userId: appUserId },
      {
        $set: {
          totalCommitsLast90Days: doc.totalCommitsLast90Days,
          featuredRepoCount: doc.featuredRepoCount,
          activeWeeksLast12: doc.activeWeeksLast12,
          weeklyBuckets: doc.weeklyBuckets,
          lastActivitySyncedAt: doc.lastActivitySyncedAt,
          updatedAt: doc.updatedAt,
        },
        $setOnInsert: { userId: appUserId, createdAt: doc.createdAt },
      },
      { upsert: true }
    );
    return doc;
  }

  const since = get90DaysAgoDate().toISOString();
  const buckets = buildEmptyWeeklyBuckets();
  const bucketMap = new Map(
    buckets.map((b, idx) => [weekStart(b.weekStart).getTime(), idx])
  );

  let totalCommits = 0;

  // For each featured repo, fetch commits by this user in last 90 days
  for (const repo of featuredRepos) {
    const fullName = repo.fullName || repo.full_name;
    if (!fullName) continue;
    const [owner, name] = fullName.split("/");
    if (!owner || !name) continue;

    try {
      const commits = await octokit.paginate(
        octokit.rest.repos.listCommits,
        {
          owner,
          repo: name,
          author: githubLogin,
          since,
          per_page: 100,
        }
      );

      for (const c of commits) {
        const commitDateStr = c.commit?.committer?.date;
        if (!commitDateStr) continue;
        const commitDate = new Date(commitDateStr);
        const ws = weekStart(commitDate);
        const key = ws.getTime();
        if (bucketMap.has(key)) {
          const idx = bucketMap.get(key);
          buckets[idx].commitCount += 1;
          totalCommits += 1;
        }
      }
    } catch (err) {
      console.error(
        `Error fetching commits for repo ${fullName}, user ${githubLogin}:`,
        err
      );
      // Continue with other repos
    }
  }

  const activeWeeks = buckets.filter((b) => b.commitCount > 0).length;

  const doc = {
    userId: appUserId,
    totalCommitsLast90Days: totalCommits,
    featuredRepoCount: featuredRepos.length,
    activeWeeksLast12: activeWeeks,
    weeklyBuckets: buckets,
    lastActivitySyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await activityCol.updateOne(
    { userId: appUserId },
    {
      $set: {
        totalCommitsLast90Days: doc.totalCommitsLast90Days,
        featuredRepoCount: doc.featuredRepoCount,
        activeWeeksLast12: doc.activeWeeksLast12,
        weeklyBuckets: doc.weeklyBuckets,
        lastActivitySyncedAt: doc.lastActivitySyncedAt,
        updatedAt: doc.updatedAt,
      },
      $setOnInsert: { userId: appUserId, createdAt: doc.createdAt },
    },
    { upsert: true }
  );

  return doc;
}
