// jobs/salaryRefreshCron.js
import cron from "node-cron";
import SalaryBenchmark from "../models/SalaryBenchmark.js";
import { fetchFromCareerOneStop } from "../services/salaryProviders/blsProvider.js";

/**
 * Config:
 * - SALARY_REFRESH_DAYS: how old a record can be before we refresh (default: 30 days)
 * - SALARY_REFRESH_BATCH: max records to refresh per run (default: 50)
 * - DISABLE_SALARY_REFRESH_CRON: set to "true" to disable this job
 */

const REFRESH_DAYS = Number(process.env.SALARY_REFRESH_DAYS || 30);
const MAX_PER_RUN = Number(process.env.SALARY_REFRESH_BATCH || 50);

/**
 * Helper: compute a JS Date threshold for "too old" benchmarks.
 */
function getStaleThreshold() {
  const now = new Date();
  const threshold = new Date(
    now.getTime() - REFRESH_DAYS * 24 * 60 * 60 * 1000
  );
  return threshold;
}

/**
 * Refresh a single SalaryBenchmark document from CareerOneStop.
 */
async function refreshSingleBenchmark(doc) {
  const title = doc.displayTitle || "";
  const isNational = doc.scope === "national" || doc.locationKey === "us";

  // Use "US" for national-level queries, otherwise use displayLocation
  const locationForApi = isNational
    ? "US"
    : doc.displayLocation || "US";

  if (!title) {
    console.warn(
      "[salary-refresh] Skipping doc with empty title:",
      doc._id.toString()
    );
    return;
  }

  const providerResult = await fetchFromCareerOneStop({
    occupationKeyword: title,
    location: locationForApi,
  });

  if (!providerResult || !providerResult.dataPoints) {
    // If we fail to refresh, just update lastFetchedAt so we don't hammer the API
    doc.lastFetchedAt = new Date();
    await doc.save().catch((err) =>
      console.error("[salary-refresh] Failed to save doc (no data):", err)
    );
    return;
  }

  const { dataPoints, meta } = providerResult;

  const finalTitle =
    (meta && meta.occupationTitle) || title;
  const wageYear = meta?.wageYear || null;
  const occupationCode = meta?.occupationCode || null;

  // For national refresh, keep locationKey "us". For location-specific, reuse doc.locationKey.
  const scope = isNational ? "national" : "location";

  const displayLocation =
    scope === "national"
      ? "United States (national)"
      : doc.displayLocation || meta?.nationalAreaName || "United States";

  doc.displayTitle = finalTitle;
  doc.displayLocation = displayLocation;
  doc.currency = providerResult.currency || "USD";
  doc.period = providerResult.period || "year";

  doc.min = dataPoints.min ?? null;
  doc.max = dataPoints.max ?? null;
  doc.p10 = dataPoints.p10 ?? null;
  doc.p25 = dataPoints.p25 ?? null;
  doc.p50 = dataPoints.p50 ?? null;
  doc.p75 = dataPoints.p75 ?? null;
  doc.p90 = dataPoints.p90 ?? null;
  doc.mean = dataPoints.mean ?? null;

  doc.wageYear = wageYear;
  doc.occupationCode = occupationCode;
  doc.sources = [providerResult.source].filter(Boolean);
  doc.hasData = true;
  doc.scope = scope;
  doc.lastFetchedAt = new Date();
  doc.raw = meta?.raw || doc.raw || null;

  await doc.save().catch((err) => {
    console.error("[salary-refresh] Failed to save updated benchmark:", err);
  });
}

/**
 * Refresh stale salary benchmarks in batches.
 */
async function refreshStaleBenchmarksBatch() {
  const threshold = getStaleThreshold();

  console.log(
    `[salary-refresh] Looking for benchmarks older than ${REFRESH_DAYS} days (before ${threshold.toISOString()})`
  );

  // We usually only need to refresh entries that:
  // - haveData = true (valid wage data)
  // - lastFetchedAt is older than threshold OR missing
  const staleDocs = await SalaryBenchmark.find({
    hasData: true,
    $or: [
      { lastFetchedAt: { $lt: threshold } },
      { lastFetchedAt: { $exists: false } },
    ],
  })
    .sort({ lastFetchedAt: 1 })
    .limit(MAX_PER_RUN)
    .exec();

  if (!staleDocs.length) {
    console.log("[salary-refresh] No stale benchmarks found.");
    return;
  }

  console.log(
    `[salary-refresh] Found ${staleDocs.length} stale benchmarks to refresh.`
  );

  for (const doc of staleDocs) {
    try {
      await refreshSingleBenchmark(doc);
    } catch (err) {
      console.error(
        "[salary-refresh] Error refreshing benchmark:",
        doc._id.toString(),
        err
      );
    }
  }

  console.log("[salary-refresh] Finished refresh batch.");
}

/**
 * Setup cron schedule.
 * Default schedule: once a week, Sunday at 3:00 AM server time.
 */
export function setupSalaryRefreshCron() {
  if (process.env.DISABLE_SALARY_REFRESH_CRON === "true") {
    console.log("[salary-refresh] Cron disabled via env flag.");
    return;
  }

  // "0 3 * * 0" = At 03:00 on Sunday.
  cron.schedule("0 3 * * 0", async () => {
    console.log("[salary-refresh] Cron job triggered.");
    try {
      await refreshStaleBenchmarksBatch();
    } catch (err) {
      console.error("[salary-refresh] Cron batch failed:", err);
    }
  });

  console.log(
    `[salary-refresh] Cron scheduled: weekly (Sun 3:00 AM), REFRESH_DAYS=${REFRESH_DAYS}, BATCH=${MAX_PER_RUN}`
  );
}
