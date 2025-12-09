// salary.js
import express from "express";
import axios from "axios";
import {
  getJob,
  getSalaryResearch,
  cacheSalaryData,
} from "../services/salary.service.js";
// routes/salary.js
import { getSalaryBenchmark } from "../services/salaryData.service.js";

const router = express.Router();

// 🔥 Salary API credentials (use env!)
const ADZUNA_API_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

// Validate API credentials on startup
if (!ADZUNA_API_ID || !ADZUNA_API_KEY) {
  console.warn('⚠️  Warning: ADZUNA_APP_ID or ADZUNA_API_KEY not set in environment variables');
}

router.get("/:id", async (req, res) => {
  console.log("💥 SALARY ROUTE HIT for job:", req.params.id);
  
  try {
    const userId = req.user?.id || req.headers['x-dev-user-id'] || "TEMP_USER";
    const jobId = req.params.id;

    // 1️⃣ Check cached salary (cache for 24 hours)
    let salaryData = await getSalaryResearch(jobId);
    
    if (salaryData) {
      const cacheAge = Date.now() - new Date(salaryData.cachedAt).getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      
      if (cacheAge < oneDayInMs) {
        console.log("✅ Returning cached salary data");
        return res.json({
          average: salaryData.average,
          min: salaryData.min,
          max: salaryData.max,
          sourceCount: salaryData.sourceCount,
          cached: true
      });
      }
    }

    // 2️⃣ Fetch job details to get jobTitle & location
    const job = await getJob({ userId, id: jobId });
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.jobTitle) {
      return res.status(400).json({ error: "Job title is required for salary research" });
    }

    // 3️⃣ Call Adzuna API
    const searchLocation = job.location || "us";
    const adzunaURL = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_API_ID}&app_key=${ADZUNA_API_KEY}&what=${encodeURIComponent(job.jobTitle)}&where=${encodeURIComponent(searchLocation)}&results_per_page=100`;
    
    console.log("🔍 Fetching from Adzuna:", adzunaURL.replace(ADZUNA_API_KEY, 'HIDDEN'));

    const response = await axios.get(adzunaURL, {
      timeout: 10000, // 10 second timeout
    });

    // 4️⃣ Extract and calculate salary data
    const salaryResults = response.data.results || [];
    
    if (salaryResults.length === 0) {
      return res.json({ 
        message: "No salary data found for this position and location",
        average: "N/A",
        sourceCount: 0
      });
    }

    // Calculate min, max, avg from jobs that have salary info
    const salaryNumbers = salaryResults
      .map(r => {
        const min = r.salary_min || r.salary_max;
        const max = r.salary_max || r.salary_min;
        if (min || max) return { min, max, avg: (min + max) / 2 };
        return null;
      })
      .filter(n => n !== null);

    if (salaryNumbers.length === 0) {
      return res.json({ 
        message: "Salary information not available for the jobs found",
        sourceCount: salaryResults.length
      });
    }

    // Calculate aggregated stats
    const avgSalary = Math.round(
      salaryNumbers.reduce((a, b) => a + b.avg, 0) / salaryNumbers.length
    );

    const minSalary = Math.min(...salaryNumbers.map(s => s.min).filter(Boolean));
    const maxSalary = Math.max(...salaryNumbers.map(s => s.max).filter(Boolean));

    
    const resultData = {
      average: avgSalary,        // Add this for backward compatibility
      min: minSalary,           // Add this
      max: maxSalary,           // Add this
      sourceCount: salaryResults.length,
      cached: false,
      cachedAt: new Date(),
      updatedAt: new Date()
    };

    // 5️⃣ Cache in DB
    await cacheSalaryData(jobId, resultData);

    console.log("✅ Salary data calculated:", resultData);

    return res.json({
      average: avgSalary,
      min: minSalary, 
      max: maxSalary,
      sourceCount: salaryResults.length,
      cached: false
    });

  } catch (err) {
    console.error("❌ Salary API error:", err.message);
    
    // Handle specific error cases
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: "Request timeout - Adzuna API took too long to respond" });
    }
    
    if (err.response) {
      // Adzuna API error
      console.error("Adzuna API Response Error:", err.response.status, err.response.data);
      return res.status(err.response.status).json({ 
        error: `Adzuna API error: ${err.response.data?.error || err.message}` 
      });
    }
    
    return res.status(500).json({ error: "Failed to fetch salary data" });
  }
});



/**
 * GET /api/salary/benchmark
 *
 * Query params:
 *   - title (required): job title, e.g. "Software Engineer"
 *   - location (optional but recommended): e.g. "New York, NY" or "NY"
 *   - jobId (optional): Job._id as string (for tracing)
 */
router.get("/get/benchmark", async (req, res) => {
  try {
    const { title, location, jobId } = req.query;
    if (!title) {
      return res
        .status(400)  
        .json({ error: "Query parameter 'title' is required." });
    }

    const benchmark = await getSalaryBenchmark({
      title,
      location: location || "",
      jobId: jobId || null,
    });

    return res.json(benchmark);
  } catch (err) {
    console.error("Error fetching salary benchmark:", err);
    return res
      .status(500)
      .json({ error: "Server error fetching salary benchmark" });
  }
});



export default router;