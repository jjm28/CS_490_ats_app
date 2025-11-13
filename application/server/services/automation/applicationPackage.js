import Jobs from "../../models/jobs.js";

export async function runApplicationPackageRule(rule) {
  const { config = {} } = rule;
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

  // 🔥 FIX HERE — remove userId requirement
  const job = await Jobs.findById(jobId);
  if (!job) {
    console.warn("[automation] Job not found:", jobId);
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

  job.applicationPackage = {
    resumeId: resumeId || null,
    coverLetterId: coverLetterId || null,
    portfolioUrls: urls,
    generatedAt: new Date(),
    generatedByRuleId: rule._id,
  };

  await job.save();

  console.log(
    `[automation] Application package generated for job ${jobId}`
  );
}