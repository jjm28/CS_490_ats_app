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
        // Use FINAL salary if available, otherwise fall back to base salary
        const salaryVals = jobs
            .map(j => {
                if (j.salaryHistory?.length > 0) {
                    return j.salaryHistory[j.salaryHistory.length - 1].finalSalary;
                }

                // fallback (rare)
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
            .flatMap(job =>
                (job.salaryHistory || []).map(entry => ({
                    jobId: job._id.toString(),
                    date: entry.date,
                    salary: entry.finalSalary,
                    company: job.company,
                    title: job.jobTitle,
                    negotiationOutcome: entry.negotiationOutcome
                }))
            )
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        // --------------------------------------------------------
        // 4) Negotiation Analytics
        // --------------------------------------------------------
        const negotiations = jobs.flatMap(j =>
            (j.salaryHistory || []).map(entry => ({
                outcome: entry.negotiationOutcome,
                finalSalary: Number(entry.finalSalary),
                salaryMin: j.salaryMin != null ? Number(j.salaryMin) : null,
                salaryMax: j.salaryMax != null ? Number(j.salaryMax) : null
            }))
        );

        // Count attempts (exclude “Not attempted”)
        const attempts = negotiations.filter(n =>
            ["Improved", "No change", "Worse", "Lost offer"].includes(n.outcome)
        ).length;

        // Count improvements
        const successes = negotiations.filter(n => n.outcome === "Improved").length;

        // Success rate
        const successRate = attempts > 0
            ? Math.round((successes / attempts) * 100)
            : 0;

        // ---- NEGOTIATION STRENGTH ----
        // Only look at "Improved" entries AND only if min/max valid
        const improvementRatios = negotiations
            .filter(n =>
                n.outcome === "Improved" &&
                n.salaryMin !== null &&
                n.salaryMax !== null &&
                n.salaryMax > n.salaryMin
            )
            .map(n => {
                const ratio = (n.finalSalary - n.salaryMin) / (n.salaryMax - n.salaryMin);
                return Math.max(0, Math.min(1, ratio)); // clamp between 0-1 just in case
            });

        // Average ratio → percentage
        const negotiationStrength =
            improvementRatios.length > 0
                ? Math.round(
                    (improvementRatios.reduce((a, b) => a + b, 0) /
                        improvementRatios.length) * 100
                )
                : 0;

        const negotiationStats = {
            successRate,
            negotiationStrength
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

            let estimated = null;

            // Prefer FINAL negotiated salary
            if (j.salaryHistory?.length > 0) {
                estimated = j.salaryHistory[j.salaryHistory.length - 1].finalSalary;
            } else {
                // fallback to min/max estimate
                if (j.salaryMin && j.salaryMax) {
                    estimated =
                        (parseFloat(j.salaryMin.toString()) +
                            parseFloat(j.salaryMax.toString())) /
                        2;
                } else if (j.salaryMin) {
                    estimated = parseFloat(j.salaryMin.toString());
                } else if (j.salaryMax) {
                    estimated = parseFloat(j.salaryMax.toString());
                }
            }

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

        // Low average salary
        if (avgSalary < 70000) {
            recommendations.push(
                "Your average salary is below typical industry thresholds. Consider targeting higher-paying roles or negotiating more aggressively."
            );
        }

        // Negotiation success rate
        if (successRate < 30 && attempts > 0) {
            recommendations.push(
                "Your negotiation success rate is low. Practice negotiation scripts or negotiate more often."
            );
        }

        // Negotiation strength (improvement patterns)
        if (negotiationStrength > 60) {
            recommendations.push(
                `Your negotiation strength is excellent — improved offers typically land in the top ${negotiationStrength}% of the employer's salary range.`
            );
        } else if (negotiationStrength > 30) {
            recommendations.push(
                `Your negotiation strength is moderate — improvements generally land around ${negotiationStrength}% of the employer's range.`
            );
        } else if (attempts > 0) {
            recommendations.push(
                `Your negotiation gains tend to be on the lower end of employer ranges. Consider enhancing your negotiation approach.`
            );
        }

        // Salary progression recommendation
        if (progression.length >= 2) {
            const start = progression[0].salary;
            const end = progression[progression.length - 1].salary;
            const growth = Math.round(((end - start) / start) * 100);

            if (growth > 20) {
                recommendations.push(
                    `Strong salary progression: ${growth}% total growth across your offers.`
                );
            }
        }

        // Default fallback
        if (recommendations.length === 0) {
            recommendations.push(
                "Your salary profile looks strong. Continue targeting high-compensation roles."
            );
        }

        // --------------------------------------------------------
        // 4b) Total Compensation Progression & Summary
        // --------------------------------------------------------
        const compProgression = jobs
            .flatMap(job =>
                (job.compHistory || []).map(entry => ({
                    jobId: job._id.toString(),
                    date: entry.date,
                    totalComp: entry.totalComp,
                    company: job.company,
                    title: job.jobTitle,
                }))
            )
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const compVals = compProgression.map(p => p.totalComp);

        const compAvg =
            compVals.length > 0
                ? Math.round(compVals.reduce((a, b) => a + b, 0) / compVals.length)
                : 0;

        const compSorted = [...compVals].sort((a, b) => a - b);
        const compMedian =
            compSorted.length > 0
                ? compSorted[Math.floor(compSorted.length / 2)]
                : 0;

        const compMin = compSorted.length > 0 ? compSorted[0] : 0;
        const compMax = compSorted.length > 0 ? compSorted[compSorted.length - 1] : 0;

        const compSummary = {
            avgTotalComp: compAvg,
            medianTotalComp: compMedian,
            minTotalComp: compMin,
            maxTotalComp: compMax,
        };

        // --------------------------------------------------------
        // 7) Career Progression Impact (Salary Growth Between Jobs)
        // --------------------------------------------------------
        let careerProgression = {
            avgChangePercent: 0,
            biggestJump: null,
        };

        if (progression.length >= 2) {
            // Sort by time
            const ordered = [...progression].sort(
                (a, b) => new Date(a.date) - new Date(b.date)
            );

            let changes = [];

            for (let i = 1; i < ordered.length; i++) {
                const prev = ordered[i - 1].salary;
                const curr = ordered[i].salary;

                if (prev > 0) {
                    const pct = ((curr - prev) / prev) * 100;
                    changes.push({
                        percent: Math.round(pct),
                        from: ordered[i - 1],
                        to: ordered[i],
                    });
                }
            }

            if (changes.length > 0) {
                const avg =
                    changes.reduce((a, b) => a + b.percent, 0) / changes.length;

                const biggest = changes.reduce((a, b) =>
                    Math.abs(a.percent) > Math.abs(b.percent) ? a : b
                );

                careerProgression = {
                    avgChangePercent: Math.round(avg),
                    biggestJump: biggest,
                };
            }
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
            compSummary,
            compProgression,
            careerProgression
        });
    } catch (err) {
        console.error("❌ Salary analytics error:", err);
        res.status(500).json({ error: "Failed to load salary analytics" });
    }
});

export default router;