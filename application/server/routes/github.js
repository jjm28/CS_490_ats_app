import express from 'express';

import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { ObjectId } from 'mongodb';
import session from "express-session";
import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";
import { Octokit } from "octokit";
import { getUserRecord,updateUserRecord , getUserRepos,
  syncReposForUser,  
  getUserReposForManage,
  getFeaturedRepos,
  updateFeaturedRepos,
  updateRepoSkills,   getActivitySnapshot,
  syncActivityForUser,} from '../services/github.service.js';
import { stat } from 'fs';


const router = express.Router();



// router.use(verifyJWT);


// unified way to get "who is this?"
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}

const {
  PORT = 5173,
  SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI,
} = process.env;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
  console.error("Missing GitHub OAuth env vars. Check .env.");
  process.exit(1);
}


// ───────────────────────────────────────────────
// Route: Check current GitHub link status
//api/github/status
// ───────────────────────────────────────────────
router.get("/status", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req)
  console.log (appUserId)

  try {
    
if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  const record = await getUserRecord(appUserId);
  if (!record?.githubAccess?.githubAccessToken) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    githubLogin: record?.githubAccess?.githubLogin,
  });

    } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }


});

// ───────────────────────────────────────────────
// Route: Start OAuth login with GitHub
// Client can redirect user here
// ───────────────────────────────────────────────
router.post("/login", verifyJWT ,async (req, res) => {
  const appUserId = getUserId(req)
  const rawState = JSON.stringify({
    userId: appUserId,
    nonce: crypto.randomUUID(),
  });

  const encodedState = Buffer.from(rawState).toString("base64url");
  res.cookie("gh_state", encodedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
   maxAge: 60 * 5 * 1000, //5 mins
    path: "/",
  });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
   // Adjust scopes based on what you need.
  // "read:user" for profile, "repo" for private repos. For only public, "read:user" is often enough.
  url.searchParams.set("scope", "read:user,repo");
  url.searchParams.set("state", encodedState);

 res.json({ redirectUrl: url.toString() })
});



// ───────────────────────────────────────────────
// Route: GitHub OAuth callback
// GitHub redirects here after the user authorizes.
// This exchanges the code -> access_token and stores it per user.
// ───────────────────────────────────────────────
router.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;

  const savedState = req.cookies.gh_state;
  if (!savedState || savedState !== state) {
    return res.status(400).send("Invalid OAuth state");
  }
   

  res.clearCookie("gh_state");
 const decoded = JSON.parse(
    Buffer.from(state, "base64url").toString("utf8")
  );
   const appUserId = decoded.userId;
  // Exchange code -> token
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
      state,
    }),
  });

  const data = await response.json();
  const accessToken = data.access_token;

  // Fetch GitHub profile
  const octokit = new Octokit({ auth: accessToken });
  const me = await octokit.rest.users.getAuthenticated();

  await updateUserRecord(appUserId, {
    githubAccessToken: accessToken,
    githubLogin: me.data.login,
  })

  res.redirect("/ProfileDashboard");
});

// ───────────────────────────────────────────────
// Route: Sync & return repos for the authenticated user
// ───────────────────────────────────────────────
// Get repos from snapshot only (no GitHub API call)
router.get("/repos", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    // Just read from DB snapshot
    const storedRepos = await getUserRepos(appUserId);

    const payload = storedRepos.map((doc) => ({
      id: doc.githubRepoId,
      name: doc.name,
      full_name: doc.fullName,
      html_url: doc.htmlUrl,
      description: doc.description ?? null,
      language: doc.language ?? null,
      stargazers_count: doc.stargazersCount ?? 0,
      forks_count: doc.forksCount ?? 0,
      updated_at: doc.updatedAt
        ? doc.updatedAt.toISOString()
        : new Date().toISOString(),
    }));

    return res.json(payload);
  } catch (err) {
    console.error("Error reading GitHub repos snapshot:", err);
    return res.status(500).json({ error: "Failed to load GitHub repos" });
  }
});


// Manually sync from GitHub → update snapshot → return fresh list
router.post("/repos/sync", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    const record = await getUserRecord(appUserId);
    if (!record?.githubAccess?.githubAccessToken) {
      return res.status(400).json({ error: "GitHub not connected" });
    }

    // 1) Sync repos snapshot
    await syncReposForUser(appUserId);

    // 2) Sync activity snapshot (ignore failures gracefully)
    try {
      await syncActivityForUser(appUserId);
    } catch (err) {
      console.error("Error syncing GitHub activity:", err);
      // do not fail the whole request
    }

    // We don't need to send repos here; FE will re-fetch featured repos & activity
    return res.json({ success: true });
  } catch (err) {
    console.error("Error syncing GitHub repos:", err);

    if (err.code === "NO_GITHUB_TOKEN") {
      return res.status(400).json({ error: "GitHub not connected" });
    }

    return res.status(500).json({ error: "Failed to sync GitHub repos" });
  }
});


// Get all repos for manage view (includes isFeatured + linkedSkillIds)
router.get("/repos/manage", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    const repos = await getUserReposForManage(appUserId);

    const payload = repos.map((doc) => ({
      id: doc.githubRepoId,
      name: doc.name,
      full_name: doc.fullName,
      html_url: doc.htmlUrl,
      description: doc.description ?? null,
      language: doc.language ?? null,
      stargazers_count: doc.stargazersCount ?? 0,
      forks_count: doc.forksCount ?? 0,
      updated_at: doc.updatedAt
        ? doc.updatedAt.toISOString()
        : new Date().toISOString(),
      isFeatured: !!doc.isFeatured,
      linkedSkillIds: doc.linkedSkillIds || [],
    }));

    return res.json(payload);
  } catch (err) {
    console.error("Error loading manage repos:", err);
    return res.status(500).json({ error: "Failed to load GitHub repos" });
  }
});

// Get only featured repos for profile display
router.get("/repos/featured", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    const repos = await getFeaturedRepos(appUserId);

    const payload = repos.map((doc) => ({
      id: doc.githubRepoId,
      name: doc.name,
      full_name: doc.fullName,
      html_url: doc.htmlUrl,
      description: doc.description ?? null,
      language: doc.language ?? null,
      stargazers_count: doc.stargazersCount ?? 0,
      forks_count: doc.forksCount ?? 0,
      updated_at: doc.updatedAt
        ? doc.updatedAt.toISOString()
        : new Date().toISOString(),
      isFeatured: !!doc.isFeatured,
      linkedSkillIds: doc.linkedSkillIds || [],
    }));

    return res.json(payload);
  } catch (err) {
    console.error("Error loading featured repos:", err);
    return res.status(500).json({ error: "Failed to load featured repos" });
  }
});

// Update which repos are featured
router.post("/repos/featured", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    const { featuredRepoIds } = req.body || {};
    const normalized = Array.isArray(featuredRepoIds)
      ? featuredRepoIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n))
      : [];

    await updateFeaturedRepos(appUserId, normalized);

    // return updated featured list
    const repos = await getFeaturedRepos(appUserId);
    const payload = repos.map((doc) => ({
      id: doc.githubRepoId,
      name: doc.name,
      full_name: doc.fullName,
      html_url: doc.htmlUrl,
      description: doc.description ?? null,
      language: doc.language ?? null,
      stargazers_count: doc.stargazersCount ?? 0,
      forks_count: doc.forksCount ?? 0,
      updated_at: doc.updatedAt
        ? doc.updatedAt.toISOString()
        : new Date().toISOString(),
      isFeatured: !!doc.isFeatured,
      linkedSkillIds: doc.linkedSkillIds || [],
    }));

    return res.json(payload);
  } catch (err) {
    console.error("Error updating featured repos:", err);
    return res.status(500).json({ error: "Failed to update featured repos" });
  }
});

// Update linked skills for a repo
router.post("/repos/:repoId/skills", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  const repoId = Number(req.params.repoId);
  if (Number.isNaN(repoId)) {
    return res.status(400).json({ error: "Invalid repo id" });
  }

  try {
    const { skillIds } = req.body || {};
    const ids = Array.isArray(skillIds) ? skillIds.map(String) : [];

    await updateRepoSkills(appUserId, repoId, ids);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error updating repo skills:", err);
    return res.status(500).json({ error: "Failed to update repo skills" });
  }
});

// ───────────────────────────────────────────────
// Route: Get GitHub activity snapshot
// ───────────────────────────────────────────────
router.get("/activity", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req);
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }

  try {
    const snapshot = await getActivitySnapshot(appUserId);
    if (!snapshot) {
      return res.json({ hasData: false });
    }

    return res.json({
      hasData: true,
      totalCommitsLast90Days: snapshot.totalCommitsLast90Days,
      featuredRepoCount: snapshot.featuredRepoCount,
      activeWeeksLast12: snapshot.activeWeeksLast12,
      weeklyBuckets: snapshot.weeklyBuckets,
      lastActivitySyncedAt: snapshot.lastActivitySyncedAt,
    });
  } catch (err) {
    console.error("Error loading GitHub activity:", err);
    return res.status(500).json({ error: "Failed to load GitHub activity" });
  }
});

export default router