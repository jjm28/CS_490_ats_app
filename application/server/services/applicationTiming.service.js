import Jobs from "../models/jobs.js";

function analyzeJob(job) {
  const history = job.statusHistory || [];

  const hasResponse = history.some(h =>
    ["phone_screen", "interview", "offer", "rejected"].includes(h.status)
  );

  const hasInterview = history.some(h =>
    ["interview", "offer"].includes(h.status)
  );

  const hasOffer = history.some(h => h.status === "offer");

  return { hasResponse, hasInterview, hasOffer };
}

function initBucket(label) {
  return {
    label,
    applications: 0,
    responses: 0,
    interviews: 0,
    offers: 0
  };
}

export async function getApplicationTimingAnalytics(userId) {
  const jobs = await Jobs.find({
    userId,
    statusHistory: { $elemMatch: { status: "applied" } }
  }).lean();

  const byDay = {};
  const byMonth = {};
  const byDeadline = {
    "0–3 days before deadline": initBucket("0–3 days"),
    "4–7 days before deadline": initBucket("4–7 days"),
    "8+ days before deadline": initBucket("8+ days"),
  };

  for (const job of jobs) {
    const applied = job.statusHistory.find(h => h.status === "applied");
    if (!applied) continue;

    const appliedDate = new Date(applied.timestamp);
    const day = appliedDate.toLocaleDateString("en-US", { weekday: "long" });
    const month = appliedDate.toLocaleDateString("en-US", { month: "long" });

    byDay[day] ??= initBucket(day);
    byMonth[month] ??= initBucket(month);

    const analysis = analyzeJob(job);
    const update = bucket => {
      bucket.applications++;
      if (analysis.hasResponse) bucket.responses++;
      if (analysis.hasInterview) bucket.interviews++;
      if (analysis.hasOffer) bucket.offers++;
    };

    update(byDay[day]);
    update(byMonth[month]);

    if (job.applicationDeadline) {
      const diffDays =
        (new Date(job.applicationDeadline) - appliedDate) / 86400000;

      if (diffDays <= 3) update(byDeadline["0–3 days before deadline"]);
      else if (diffDays <= 7) update(byDeadline["4–7 days before deadline"]);
      else update(byDeadline["8+ days before deadline"]);
    }
  }

  const finalize = buckets =>
    Object.values(buckets).map(b => ({
      label: b.label,
      applications: b.applications,
      responseRate: b.applications ? Math.round((b.responses / b.applications) * 100) : 0,
      interviewRate: b.applications ? Math.round((b.interviews / b.applications) * 100) : 0,
      offerRate: b.applications ? Math.round((b.offers / b.applications) * 100) : 0,
    }));

  return {
    byDayOfWeek: finalize(byDay),
    byMonth: finalize(byMonth),
    byDeadlineWindow: finalize(byDeadline)
  };
}