import express from 'express';

import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { ObjectId } from 'mongodb';
import session from "express-session";
import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";
import { Octokit } from "octokit";
import { getUserRecord,updateUserRecord } from '../services/github.service.js';
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

router.get("/repos", verifyJWT, async (req, res) => {
  const appUserId = getUserId(req)
  if (!appUserId) {
    return res.status(401).json({ error: "Not logged in to app" });
  }
  const record = await getUserRecord(appUserId);
  console.log(record)

  if (!record?.githubAccess?.githubAccessToken) {
    return res.status(400).json({ error: "GitHub not connected" });
  }

  try {
    
    const octokit = new Octokit({ auth: record?.githubAccess?.githubAccessToken });

    // Example: list all repos for the authenticated user
    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      {
        per_page: 100,
       visibility: "public", // visibility: "all", // or "public" if you only care about public repos
        sort: "updated",
      }
    );

    // You can also map this to a simplified structure if you don't want to send everything
    // const simplified = repos.map(r => ({
    //   id: r.id,
    //   name: r.name,
    //   fullName: r.full_name,
    //   url: r.html_url,
    //   description: r.description,
    //   language: r.language,
    //   stargazersCount: r.stargazers_count,
    // }));

    res.json(repos);
  } catch (err) {
    console.error("Error fetching repos:", err);
    res.status(500).json({ error: "Failed to fetch GitHub repos" });
  }
});

export default router