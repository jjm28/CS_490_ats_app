// routes/market.js
import { Router } from "express";
import mongoose from "mongoose";
import Jobs from "../models/jobs.js";
import { extractSkillsAI } from "../utils/extractSkillsAI.js";
import { extractEducationAI } from "../utils/extractEducationAI.js";
import { verifyJWT } from "../middleware/auth.js";

const router = Router();

router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.headers["x-dev-user-id"]) return req.headers["x-dev-user-id"].toString();
  if (req.user?.id) return req.user.id.toString();
  return null;
}

router.get("/industries", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing user id" });

    const jobs = await Jobs.find({ userId }).lean();
    const industries = Array.from(
      new Set(jobs.map((j) => j.industry).filter(Boolean))
    );

    res.json(industries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch industries" });
  }
});

router.get("/skills", async (req, res) => {
  try {
    const userId = getUserId(req);
    const industry = req.query.industry;

    if (!userId || !industry) return res.json([]);

    const jobs = await Jobs.find({ userId, industry }).lean();

    const skillCounts = {};

    for (const job of jobs) {
      let skills = job.skillsExtracted;

      if (!job.skillsParsed || !skills.length) {
        skills = await extractSkillsAI(job.description || "");
        await Jobs.updateOne(
          { _id: job._id },
          { skillsExtracted: skills, skillsParsed: true }
        );
      }

      for (const skill of skills) {
        const lower = skill.toLowerCase();
        skillCounts[lower] = (skillCounts[lower] || 0) + 1;
      }
    }

    const sorted = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);

    res.json(sorted);

  } catch (err) {
    res.status(500).json({ error: "Failed to process skills" });
  }
});

/* ============================================================
   GET /market/job/:jobId/skills
   Extract skills for a single job (UC-123)
============================================================ */
router.get("/job/:jobId/skills", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { jobId } = req.params;

    if (!userId || !jobId) return res.json([]);

    const job = await Jobs.findOne({ _id: jobId, userId }).lean();
    if (!job || !job.description) return res.json([]);

    let skills = job.skillsExtracted || [];

    // If not parsed yet → extract and save
    if (!job.skillsParsed || skills.length === 0) {
      skills = await extractSkillsAI(job.description || "");

      await Jobs.updateOne(
        { _id: job._id },
        { skillsExtracted: skills, skillsParsed: true }
      );
    }

    // Return in SAME FORMAT as industry skills
    const counts = {};
    for (const skill of skills) {
      const lower = skill.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    }

    const result = Object.entries(counts).map(([skill, count]) => ({
      skill,
      count,
    }));

    res.json(result);

  } catch (err) {
    console.error("Error extracting job skills:", err);
    res.status(500).json({ error: "Failed to extract job skills" });
  }
});

router.get("/job/:jobId/education", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { jobId } = req.params;

    if (!userId || !jobId) {
      return res.json({ level: null, fields: [] });
    }

    const job = await Jobs.findOne({ _id: jobId, userId }).lean();

    if (!job || !job.description) {
      return res.json({ level: null, fields: [] });
    }

    let education = job.educationExtracted;

    if (
      !education ||
      !education.level ||
      !Array.isArray(education.fields) ||
      education.fields.length === 0
    ) {
      education = await extractEducationAI(job.description);

      // ❗ ONLY cache if extraction actually succeeded
      if (education?.level) {
        await Jobs.updateOne(
          { _id: job._id },
          { educationExtracted: education }
        );
      }
    }

    // ✅ ALWAYS return valid JSON
    return res.json({
      level: education?.level ?? null,
      fields: Array.isArray(education?.fields) ? education.fields : [],
    });

  } catch (err) {
    console.error("Education extraction error:", err);

    // ✅ NEVER return nothing
    return res.json({ level: null, fields: [] });
  }
});


/* ============================================================
   GET /market/companies?industry=X
   Return top hiring companies for the selected industry
============================================================ */
router.get("/companies", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    const industry = req.query.industry;
    if (!industry) return res.json([]);

    const jobs = await Jobs.find({ userId, industry }).lean();

    const companyCounts = {};

    for (const job of jobs) {
      const comp = job.company?.trim();
      if (!comp) continue;
      companyCounts[comp] = (companyCounts[comp] || 0) + 1;
    }

    const sorted = Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json(sorted);
  } catch (err) {
    console.error("Error analyzing companies:", err);
    res.status(500).json({ error: "Failed to fetch company data" });
  }
});

/* ============================================================
   GET /market/industry-trends
   Count how many jobs per industry (growth indicator)
============================================================ */
router.get("/industry-trends", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    const jobs = await Jobs.find({ userId }).lean();
    const counts = {};

    for (const job of jobs) {
      if (!job.industry) continue;
      counts[job.industry] = (counts[job.industry] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    res.json(sorted);
  } catch (err) {
    console.error("Error fetching industry trends:", err);
    res.status(500).json({ error: "Failed to fetch industry trends" });
  }
});

/* ============================================================
   GET /market/emerging-skills
   Identify skills increasing in demand across all industries
============================================================ */
router.get("/emerging-skills", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    const jobs = await Jobs.find({ userId }).lean();

    const skillCounts = {};

    for (const job of jobs) {
      let extracted = job.skillsExtracted || [];

      // If not parsed yet → extract and save
      if (!job.skillsParsed || extracted.length === 0) {
        extracted = await extractSkillsAI(job.description || "");

        await Jobs.updateOne(
          { _id: job._id },
          { skillsExtracted: extracted, skillsParsed: true }
        );
      }

      // Fallback: use keywords if still empty
      if (extracted.length === 0 && job.description) {
        const text = job.description.toLowerCase();

        const fallbackSkills = [
          "javascript", "python", "sql", "excel", "c++", "react",
          "system design", "distributed systems", "data analysis",
          "ui design", "account management", "finance", "blockchain"
        ];

        for (const s of fallbackSkills) {
          if (text.includes(s)) extracted.push(s);
        }
      }

      // Count skills
      for (const skill of extracted) {
        const lower = skill.toLowerCase();
        skillCounts[lower] = (skillCounts[lower] || 0) + 1;
      }
    }

    const sorted = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json(sorted);
  } catch (err) {
    console.error("Error detecting emerging skills:", err);
    return res.status(500).json({ error: "Failed to fetch emerging skills" });
  }
});

router.get("/job-count", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({ count: 0 });

    const total = await Jobs.countDocuments({ userId });
    res.json({ count: total });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job count" });
  }
});

/* ============================================================
   GET /market/user/education
   Return user's education for analytics (DEV SAFE)
============================================================ */
router.get("/user/education", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    // education collection already exists (used by /api/education)
    const education = await mongoose
      .connection
      .collection("education")
      .find({ userId })
      .toArray();

    return res.json(education);
  } catch (err) {
    console.error("Error fetching user education:", err);
    return res.json([]);
  }
});

export default router;