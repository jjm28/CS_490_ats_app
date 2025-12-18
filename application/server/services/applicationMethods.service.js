// services/analytics/applicationMethods.service.js
import Jobs from "../models/jobs.js";

/**
 * Aggregate performance by application method
 * (direct, referral, recruiter, etc.)
 */
export async function getApplicationMethodPerformance(userId) {
  const jobs = await Jobs.find({
    userId,
    applicationMethod: { $exists: true, $ne: null },
    statusHistory: { $elemMatch: { status: "applied" } }
  }).lean();

  const stats = {};

  for (const job of jobs) {
    const method = job.applicationMethod;
    if (!method) continue;

    if (!stats[method]) {
      stats[method] = {
        method,
        applications: 0,
        responses: 0,
        interviews: 0,
        offers: 0
      };
    }

    const history = job.statusHistory || [];
    const bucket = stats[method];

    bucket.applications++;

    const hasResponse = history.some(h =>
      ["phone_screen", "interview", "offer", "rejected"].includes(h.status)
    );

    const hasInterview = history.some(h =>
      ["interview", "offer"].includes(h.status)
    );

    const hasOffer = history.some(h => h.status === "offer");

    if (hasResponse) bucket.responses++;
    if (hasInterview) bucket.interviews++;
    if (hasOffer) bucket.offers++;
  }

  return Object.values(stats).map(m => ({
    method: m.method,
    applications: m.applications,
    responseRate: m.applications
      ? Math.round((m.responses / m.applications) * 100)
      : 0,
    interviewRate: m.applications
      ? Math.round((m.interviews / m.applications) * 100)
      : 0,
    offerRate: m.applications
      ? Math.round((m.offers / m.applications) * 100)
      : 0
  }));
}