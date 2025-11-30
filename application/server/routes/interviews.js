// server/routes/interviews.js
import express from "express";
import Jobs from "../models/jobs.js"; // path to your Jobs model

const router = express.Router();

function getUserId(req) {
  // In dev you’ve been using x-dev-user-id on the client
  // If you also have auth middleware, you can prefer req.user._id
  return req.user?._id || req.headers["x-dev-user-id"];
}

router.get("/analytics", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    // 1) Load all jobs for this user (with embedded interviews)
    const jobs = await Jobs.find({ userId }).lean();

    const interviews = [];

    for (const job of jobs) {
      const base = {
        jobId: job._id.toString(),
        company: job.company,
        industry: job.industry || "Unknown",
        companySize: job.companySize || "Unknown",
      };

      // 1) Add ALL saved interviews normally
      if (job.interviews && job.interviews.length > 0) {
        for (const iv of job.interviews) {
          interviews.push({
            ...base,
            date: iv.date,
            type: iv.type || "Unknown",
            outcome: job.status === "offer" ? "offer" :
              job.status === "rejected" ? "rejected" :
                "pending",
          });
        }
      }

      // 2) If NO saved interviews, infer from job status
      else if (["interview", "offer", "rejected"].includes(job.status)) {
        interviews.push({
          ...base,
          date: job.updatedAt || job.createdAt,
          type: "Implicit",
          outcome: job.status === "offer" ? "offer" :
            job.status === "rejected" ? "rejected" :
              "pending",
        });
      }
    }

    if (interviews.length === 0) {
      return res.json({
        conversionRates: {
          overallRate: 0,
          byMonth: [],
        },
        formatPerformance: [],
        improvementTrends: {
          points: [],
        },
        industryComparison: [],
        feedbackThemes: {
          strengths: [],
          weaknesses: [],
        },
        confidenceTracking: {
          points: [],
        },
        coachingRecommendations: [
          "You don't have any interviews logged yet. Once you start logging them, you'll see trends and personalized tips here.",
        ],
        benchmarks: {
          overallRate: { you: 0, average: 25, top: 60 },
          formatRates: [],
        },
      });
    }

    // Helper: map outcome → numeric score (very rough)
    function outcomeScore(outcome) {
      switch (outcome) {
        case "offer":
          return 100;
        case "passed":
          return 75;
        case "rejected":
          return 0;
        default:
          return 50; // pending / unknown
      }
    }

    // -------------------------
    // 1) Conversion rates
    // -------------------------
    const completed = interviews.filter((i) =>
      ["offer", "rejected", "passed"].includes(i.outcome)
    );
    const offers = completed.filter((i) => i.outcome === "offer");

    const overallRate =
      completed.length > 0
        ? Math.round((offers.length / completed.length) * 100)
        : 0;

    // group by month label "YYYY-MM"
    const byMonthMap = new Map();
    for (const i of completed) {
      const d = new Date(i.date);
      if (isNaN(d.getTime())) continue;
      const label = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
      const bucket = byMonthMap.get(label) || { label, total: 0, offers: 0 };
      bucket.total += 1;
      if (i.outcome === "offer") bucket.offers += 1;
      byMonthMap.set(label, bucket);
    }

    const byMonth = Array.from(byMonthMap.values()).map((b) => ({
      label: b.label,
      rate: b.total > 0 ? Math.round((b.offers / b.total) * 100) : 0,
    }));

    // -------------------------
    // 2) Performance by format
    // -------------------------
    const formatMap = new Map();
    for (const i of completed) {
      const fmt = i.type || "unknown";
      const bucket =
        formatMap.get(fmt) || { format: fmt, total: 0, offers: 0 };
      bucket.total += 1;
      if (i.outcome === "offer") bucket.offers += 1;
      formatMap.set(fmt, bucket);
    }

    const formatPerformance = Array.from(formatMap.values()).map((b) => ({
      format: b.format,
      successRate:
        b.total > 0 ? Math.round((b.offers / b.total) * 100) : 0,
      count: b.total,
    }));

    // -------------------------
    // 3) Improvement trends (very simple: chronological score)
    // -------------------------
    const sortedByDate = [...completed].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const improvementPoints = sortedByDate.map((i, idx) => ({
      label: `#${idx + 1}`,
      // if you later add i.mock === true, you can split mock vs real
      mockScore: outcomeScore(i.outcome),
      realScore: outcomeScore(i.outcome),
    }));

    // -------------------------
    // 4) Industry comparison
    // -------------------------
    const industryMap = new Map();
    for (const i of completed) {
      const ind = i.industry || "Unknown";
      const bucket =
        industryMap.get(ind) || { industry: ind, total: 0, offers: 0 };
      bucket.total += 1;
      if (i.outcome === "offer") bucket.offers += 1;
      industryMap.set(ind, bucket);
    }

    const industryComparison = Array.from(industryMap.values()).map((b) => ({
      industry: b.industry,
      offerRate:
        b.total > 0 ? Math.round((b.offers / b.total) * 100) : 0,
      interviewCount: b.total,
    }));

    // -------------------------
    // 5) Feedback themes (placeholder)
    // -------------------------
    const feedbackThemes = {
      strengths: [
        { theme: "Communication", count: 3 },
        { theme: "Technical depth", count: 2 },
      ],
      weaknesses: [
        { theme: "Behavioral storytelling", count: 2 },
        { theme: "System design structure", count: 1 },
      ],
    };
    // TODO: later, derive from a real `feedbackNotes` field if you add one.

    // -------------------------
    // 6) Confidence tracking (placeholder trend)
    // -------------------------
    const confidencePoints = sortedByDate.map((i, idx) => ({
      label: `#${idx + 1}`,
      confidence: Math.min(95, 60 + idx * 5), // fake upward trend
      anxiety: Math.max(20, 60 - idx * 5),
    }));

    // -------------------------
    // 7) Coaching recommendations
    // -------------------------
    const coachingRecommendations = [];
    if (overallRate < 20) {
      coachingRecommendations.push(
        "Your interview-to-offer rate is currently below 20%. Focus on tightening your core story and practicing mock interviews weekly."
      );
    } else if (overallRate < 40) {
      coachingRecommendations.push(
        "Your conversion rate shows progress, but there is room to improve. Prioritize your weakest interview format for targeted practice."
      );
    } else {
      coachingRecommendations.push(
        "Your interview conversion rate is strong. Keep refining your strengths and target higher-bar opportunities."
      );
    }

    if (formatPerformance.length > 0) {
      const worstFormat = [...formatPerformance].sort(
        (a, b) => a.successRate - b.successRate
      )[0];
      coachingRecommendations.push(
        `Your lowest-performing interview format is ${worstFormat.format} interviews. Spend extra preparation time on this style (mock sessions, recording yourself, focused drills).`
      );
    }

    if (industryComparison.length > 0) {
      const bestIndustry = [...industryComparison].sort(
        (a, b) => b.offerRate - a.offerRate
      )[0];
      coachingRecommendations.push(
        `You perform best in ${bestIndustry.industry} interviews. Double down on opportunities in this industry while you continue improving weaker areas.`
      );
    }

    // -------------------------
    // 8) Benchmarks (simple static example)
    // -------------------------
    const benchmarks = {
      overallRate: {
        you: overallRate,
        average: 25,
        top: 60,
      },
      formatRates: formatPerformance.map((f) => ({
        format: f.format,
        you: f.successRate,
        average: 25,
        top: 60,
      })),
    };

    const analytics = {
      conversionRates: {
        overallRate,
        byMonth,
      },
      formatPerformance,
      improvementTrends: {
        points: improvementPoints,
      },
      industryComparison,
      feedbackThemes,
      confidenceTracking: {
        points: confidencePoints,
      },
      coachingRecommendations,
      benchmarks,
    };

    res.json(analytics);
  } catch (err) {
    console.error("❌ Error building interview analytics:", err);
    res
      .status(500)
      .json({ error: "Failed to load interview analytics" });
  }
});

export default router;