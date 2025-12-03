// server/routes/interviews.js
import express from "express";
import Jobs from "../models/jobs.js"; // path to your Jobs model
import { verifyJWT } from "../middleware/auth.js";

const router = express.Router();

// function getUserId(req) {
//   // In dev you’ve been using x-dev-user-id on the client
//   // If you also have auth middleware, you can prefer req.user._id
//   return req.user?._id || req.headers["x-dev-user-id"];
// }

router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

function getDevId(req) {
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

router.get("/upcoming", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    // Fetch all jobs for this user
    const jobs = await Jobs.find({ userId, archived: { $ne: true } }).lean();

    const upcomingInterviews = [];
    const now = new Date();

    for (const job of jobs) {
      if (job.interviews && job.interviews.length > 0) {
        for (const interview of job.interviews) {
          const interviewDate = new Date(interview.date);
          
          // Only include future interviews
          if (interviewDate >= now) {
            upcomingInterviews.push({
              _id: interview._id.toString(),
              jobId: job._id.toString(),
              company: job.company,
              jobTitle: job.jobTitle,
              type: interview.type,
              date: interview.date,
              interviewer: interview.interviewer,
              locationOrLink: interview.locationOrLink,
              preparationChecklist: interview.preparationChecklist,
              hasChecklist: interview.preparationChecklist?.items?.length > 0 || false,
            });
          }
        }
      }
    }

    // Sort by date (soonest first)
    upcomingInterviews.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(upcomingInterviews);
  } catch (err) {
    console.error("❌ Error fetching upcoming interviews:", err);
    res.status(500).json({ error: "Failed to fetch upcoming interviews" });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    // 1) Load all jobs for this user (with embedded interviews)
    const jobs = await Jobs.find({ userId }).lean();

    const interviews = [];

    console.log("🔥 All jobs:", jobs.map(j => ({
      id: j._id.toString(),
      status: j.status,
      interviews: j.interviews
    })));

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
            outcome: iv.outcome || "pending",
            confidenceLevel: iv.confidenceLevel ?? null,
            anxietyLevel: iv.anxietyLevel ?? null,
          });
          console.log("🔥 Flattened interviews:", interviews);
        }
      }

      // 2) If NO saved interviews, infer an implicit interview
      // ONLY if the job actually reached the Interview stage (interview/offer).
      // Dragging a job straight to "rejected" should NOT count as an interview.
      else if (["interview", "offer"].includes(job.status)) {
        interviews.push({
          ...base,
          date: job.updatedAt || job.createdAt,
          type: "Implicit",
          outcome: job.status === "offer" ? "offer" : "pending",
        });
        console.log("🔥 Flattened interviews:", interviews);
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
    // EXPLICIT interviews (phone/video/in-person) should ALWAYS count
    // IMPLICIT interviews only count if they are completed (offer/rejected/passed)
    // EXPLICIT interviews (phone/video/in-person) should only count if completed
    // IMPLICIT interviews count if completed
    const completed = interviews.filter(i => {
      if (i.type !== "Implicit") {
        return ["offer", "rejected", "passed"].includes(i.outcome);
      }
      return ["offer", "rejected", "passed"].includes(i.outcome);
    });
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

    // 6) Confidence & Anxiety Tracking (REAL DATA)
    const confidencePoints = sortedByDate
      .filter(i => i.confidenceLevel != null && i.anxietyLevel != null)
      .map((i, idx) => ({
        label: `#${idx + 1}`,
        confidence: i.confidenceLevel,
        anxiety: i.anxietyLevel,
      }));

    // average calculations
    const avgConfidence =
      confidencePoints.reduce((sum, p) => sum + p.confidence, 0) /
      (confidencePoints.length || 1);

    const avgAnxiety =
      confidencePoints.reduce((sum, p) => sum + p.anxiety, 0) /
      (confidencePoints.length || 1);

    // trends (simple first-last comparison)
    const confidenceTrend =
      confidencePoints.length >= 2
        ? confidencePoints[confidencePoints.length - 1].confidence -
        confidencePoints[0].confidence
        : 0;

    const anxietyTrend =
      confidencePoints.length >= 2
        ? confidencePoints[0].anxiety -
        confidencePoints[confidencePoints.length - 1].anxiety
        : 0;

    // -------------------------
    // Mental Prep Score (NEW)
    // -------------------------
    // 50% confidence, 50% inverse anxiety
    const mentalPrepScore = Math.round(
      ((avgConfidence / 5) * 100) * 0.5 +
      (((5 - avgAnxiety) / 5) * 100) * 0.5
    );

    let mentalPrepLabel = "Needs Improvement";
    if (mentalPrepScore >= 80) mentalPrepLabel = "Excellent";
    else if (mentalPrepScore >= 65) mentalPrepLabel = "Good";
    else if (mentalPrepScore >= 50) mentalPrepLabel = "Fair";

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
    // Confidence & Anxiety Coaching (NEW)
    // -------------------------

    // Confidence-based feedback
    if (avgConfidence >= 4) {
      coachingRecommendations.push(
        "Your confidence levels are strong — maintain your preparation routine."
      );
    } else if (avgConfidence >= 3) {
      coachingRecommendations.push(
        "Your confidence is solid, but there’s room for improvement. Try rehearsing with mock interviews or tightening your storytelling."
      );
    } else {
      coachingRecommendations.push(
        "Your confidence is low — consider practicing question frameworks, doing more mock interviews, and reviewing past successes to boost certainty."
      );
    }

    // Anxiety-based feedback
    if (avgAnxiety <= 2) {
      coachingRecommendations.push(
        "Excellent anxiety control — you stay calm and collected during interviews."
      );
    } else if (avgAnxiety <= 3) {
      coachingRecommendations.push(
        "Your anxiety levels are normal. Try short breathing exercises, grounding techniques, or a light walk before interviews."
      );
    } else {
      coachingRecommendations.push(
        "High anxiety detected — build a pre-interview routine including deep breathing, visualization, and structured practice to reduce stress."
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
        avgConfidence,
        avgAnxiety,
        confidenceTrend,
        anxietyTrend
      },

      mentalPrep: {
        score: mentalPrepScore,
        label: mentalPrepLabel
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