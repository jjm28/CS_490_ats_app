import Jobs from "../../models/jobs.js";

export async function runApplicationPackageRule(rule) {
  const { userId, config = {} } = rule;

  console.log("[applicationPackage] RAW RULE CONFIG:", config);

  const {
    jobId,

    // Resume
    resumeId,
    resumeVersionId,
    resumeVersionLabel,

    // Cover Letter
    coverLetterId,
    coverLetterVersionId,
    coverLetterVersionLabel,

    portfolioUrl,
    portfolioUrls,
  } = config;

  if (!jobId) {
    console.warn("[automation] No jobId provided");
    return;
  }

  // ✅ SECURITY: only modify user's own job
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

  await Jobs.updateOne(
    { _id: jobId, userId },
    {
      $set: {
        applicationPackage: {
          // Resume
          resumeId: resumeId || null,
          resumeVersionId: resumeVersionId || null,
          resumeVersionLabel: resumeVersionLabel || null,

          // Cover Letter
          coverLetterId: coverLetterId || null,
          coverLetterVersionId: coverLetterVersionId || null,
          coverLetterVersionLabel: coverLetterVersionLabel || null,

          portfolioUrls: urls,
          generatedAt: new Date(),
          generatedByRuleId: rule._id,
        },
      },
    }
  );

  console.log(
    `[automation] Application package saved for job ${jobId}`,
    {
      resumeVersionId,
      coverLetterVersionId,
    }
  );
}