// server/routes/salary-analytics.js
import express from "express";
import Jobs from "../models/jobs.js";

const router = express.Router();

function getUserId(req) {
    return req.user?._id || req.headers["x-dev-user-id"];
}

/**
 * UC-100 Salary Progression & Market Positioning Analytics
 */
router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ error: "Missing user id" });
        }

        // 1) Load all jobs for this user
        const jobs = await Jobs.find({ userId }).lean();

        if (!jobs || jobs.length === 0) {
            return res.json({
                summary: { avgSalary: 0, medianSalary: 0, minSalary: 0, maxSalary: 0 },
                progression: [],
                negotiationStats: { attempts: 0, successes: 0, successRate: 0 },
                marketPositioning: [],
                recommendations: [],
            });
        }

        // --------------------------------------------------------
        // Helper: extract numeric salary range (min & max)
        // --------------------------------------------------------
        const salaryVals = jobs
            .map(j => {
                const min = j.salaryMin ? parseFloat(j.salaryMin.toString()) : null;
                const max = j.salaryMax ? parseFloat(j.salaryMax.toString()) : null;
                if (min === null && max === null) return null;
                if (min !== null && max !== null) return (min + max) / 2;
                return min || max;
            })
            .filter(v => v !== null);

        // --------------------------------------------------------
        // 2) Salary Summary
        // --------------------------------------------------------
        const avgSalary =
            salaryVals.length > 0
                ? Math.round(salaryVals.reduce((a, b) => a + b, 0) / salaryVals.length)
                : 0;

        const sorted = [...salaryVals].sort((a, b) => a - b);
        const medianSalary =
            sorted.length > 0
                ? sorted[Math.floor(sorted.length / 2)]
                : 0;

        const minSalary = sorted.length > 0 ? sorted[0] : 0;
        const maxSalary = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

        const summary = {
            avgSalary,
            medianSalary,
            minSalary,
            maxSalary,
        };

        // --------------------------------------------------------
        // 3) Salary Progression Over Time
        // --------------------------------------------------------
        const progression = jobs
            .filter(j => j.offerDate && (j.salaryMin || j.salaryMax))
            .map(j => {
                const salary =
                    j.salaryMin && j.salaryMax
                        ? (parseFloat(j.salaryMin.toString()) + parseFloat(j.salaryMax.toString())) / 2
                        : j.salaryMin
                            ? parseFloat(j.salaryMin.toString())
                            : parseFloat(j.salaryMax.toString());

                return {
                    date: j.offerDate,
                    salary,
                    company: j.company,
                    title: j.jobTitle,
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // --------------------------------------------------------
        // 4) Negotiation Analytics
        // --------------------------------------------------------
        const negotiations = jobs
            .map(j => j.salaryAnalysis?.negotiation)
            .filter(n => n && n.attempted === true);

        const attempts = negotiations.length;
        const successes = negotiations.filter(n => n.outcome === "improved-offer").length;
        const successRate = attempts > 0 ? Math.round((successes / attempts) * 100) : 0;

        const negotiationStats = {
            attempts,
            successes,
            successRate,
        };

        // --------------------------------------------------------
        // 5) Market Positioning (Industry + Location Comparison)
        // --------------------------------------------------------
        // Static example benchmark dataset (expand later or fetch from API)
        const benchmarkTable = {
            "Software Engineer|NYC": { median: 115000, top: 160000 },
            "Software Engineer|Remote": { median: 100000, top: 145000 },
            "Data Analyst|NYC": { median: 90000, top: 120000 },
            "Any|Any": { median: 85000, top: 130000 },
        };

        const marketPositioning = jobs.map(j => {
            const key =
                `${j.jobTitle}|${j.location}` in benchmarkTable
                    ? `${j.jobTitle}|${j.location}`
                    : "Any|Any";

            const benchmark = benchmarkTable[key];

            const estimated =
                j.salaryMin && j.salaryMax
                    ? (parseFloat(j.salaryMin.toString()) + parseFloat(j.salaryMax.toString())) / 2
                    : j.salaryMin
                        ? parseFloat(j.salaryMin.toString())
                        : j.salaryMax
                            ? parseFloat(j.salaryMax.toString())
                            : null;

            return {
                jobId: j._id.toString(),
                title: j.jobTitle,
                company: j.company,
                estimatedSalary: estimated,
                benchmarkMedian: benchmark.median,
                benchmarkTop: benchmark.top,
                belowMedian: estimated ? estimated < benchmark.median : false,
                nearTop: estimated ? estimated >= benchmark.top * 0.9 : false,
            };
        });

        // --------------------------------------------------------
        // 6) Recommendations Engine
        // --------------------------------------------------------
        const recommendations = [];

        if (avgSalary < 70000) {
            recommendations.push("Your average salary is below typical industry thresholds. Consider targeting higher-paying roles or negotiating more aggressively.");
        }

        if (successRate < 30) {
            recommendations.push("Your negotiation success rate is low. Practice negotiation scripts or consider negotiating more often.");
        }

        if (progression.length >= 2) {
            const start = progression[0].salary;
            const end = progression[progression.length - 1].salary;
            const growth = Math.round(((end - start) / start) * 100);
            if (growth > 20) {
                recommendations.push(`Strong salary progression: ${growth}% total growth across your offers.`);
            }
        }

        if (recommendations.length === 0) {
            recommendations.push("Your salary profile looks strong. Continue applying to higher-tier roles for even better compensation.");
        }

        // --------------------------------------------------------
        // Final Response
        // --------------------------------------------------------
        return res.json({
            summary,
            progression,
            negotiationStats,
            marketPositioning,
            recommendations,
        });

    } catch (err) {
        console.error("❌ Salary analytics error:", err);
        res.status(500).json({ error: "Failed to load salary analytics" });
    }
});

export default router;