import Jobs from "../../models/jobs.js";

export async function runApplicationPackageRule(rule) {
  const { userId, config = {} } = rule;
  const {
    jobId,
    resumeId,
    coverLetterId,
    portfolioUrl,
    portfolioUrls,
  } = config;

  if (!jobId) {
    console.warn("[automation] No jobId provided");
    return;
  }

  // ✅ SECURITY: Only modify jobs that belong to this user
  const job = await Jobs.findOne({ _id: jobId, userId });
  if (!job) {
    console.warn("[automation] Job not found or doesn't belong to user:", jobId);
    return;
  }

  const urls =
    Array.isArray(portfolioUrls) && portfolioUrls.length > 0
      ? portfolioUrls
      : portfolioUrl
      ? [portfolioUrl]
      : [];

  if (!resumeId && !coverLetterId && urls.length === 0) {
    console.warn("[automation] Nothing selected, skipping");
    return;
  }

  // Use updateOne to avoid validation errors on existing job data
  await Jobs.updateOne(
    { _id: jobId, userId },
    {
      $set: {
        applicationPackage: {
          resumeId: resumeId || null,
          coverLetterId: coverLetterId || null,
          portfolioUrls: urls,
          generatedAt: new Date(),
          generatedByRuleId: rule._id,
        }
      }
    }
  );

  console.log(
    `[automation] Application package generated for job ${jobId}`
  );
}