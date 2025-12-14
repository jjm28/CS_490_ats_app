// services/salaryData.service.js
import { fetchFromCareerOneStop } from "./salaryProviders/blsProvider.js";
import SalaryBenchmark from "../models/SalaryBenchmark.js";

/**
 * Map a SalaryBenchmark Mongo document to the API response shape.
 */
function mapDocToResponse(doc, { jobId, fallbackTitle, fallbackLocation }) {
  const hasData = doc.hasData === true;

  return {
    jobId: jobId || doc.jobId || null,
    title: doc.displayTitle || fallbackTitle,
    location: doc.displayLocation || fallbackLocation || "",
    currency: doc.currency || "USD",
    period: doc.period || "year",

    min: doc.min ?? null,
    max: doc.max ?? null,
    p10: doc.p10 ?? null,
    p25: doc.p25 ?? null,
    p50: doc.p50 ?? null,
    p75: doc.p75 ?? null,
    p90: doc.p90 ?? null,
    mean: doc.mean ?? null,

    wageYear: doc.wageYear || null,
    occupationCode: doc.occupationCode || null,

    sources: Array.isArray(doc.sources) ? doc.sources : [],
    hasData,
    lastUpdated: doc.lastFetchedAt
      ? doc.lastFetchedAt.toISOString()
      : null,
    scope: doc.scope || "none",
  };
}

/**
 * Main service to get a normalized salary benchmark for a job, with caching.
 *
 * Behavior:
 * - Checks Mongo cache first using (title, location).
 * - If not found, calls CareerOneStop.
 * - If location lookup fails, falls back to national ("US") and caches that.
 * - Caches both positive (hasData=true) and negative (hasData=false) results.
 */
export async function getSalaryBenchmark({ title, location, jobId }) {
  if (!title) {
    throw new Error("Job title is required to fetch salary benchmark.");
  }

  const trimmedTitle = title.trim();
  const originalLocation = (location || "").trim();

  const titleKey = trimmedTitle.toLowerCase();
  const locationKey = originalLocation.toLowerCase();
  const nationalKey = "us";

  // 1️⃣ Try cache first
  let cachedDoc = null;

  if (originalLocation) {
    // First try exact location
    cachedDoc = await SalaryBenchmark.findOne({
      jobTitleKey: titleKey,
      locationKey: locationKey,
    });

    // If not found, try national fallback
    if (!cachedDoc) {
      cachedDoc = await SalaryBenchmark.findOne({
        jobTitleKey: titleKey,
        locationKey: nationalKey,
      });
    }
  } else {
    // No location given → just try national
    cachedDoc = await SalaryBenchmark.findOne({
      jobTitleKey: titleKey,
      locationKey: nationalKey,
    });
  }

  if (cachedDoc) {
    return mapDocToResponse(cachedDoc, {
      jobId,
      fallbackTitle: trimmedTitle,
      fallbackLocation: originalLocation,
    });
  }

  // 2️⃣ Cache miss → call external provider(s)
  let providerResult = null;
  let scope = "none"; // "location" | "national" | "none"
  let locationUsed = originalLocation;

  // Try location-specific if we have one
  if (originalLocation) {
    providerResult = await fetchFromCareerOneStop({
      occupationKeyword: trimmedTitle,
      location: originalLocation,
    });
    if (providerResult && providerResult.dataPoints) {
      scope = "location";
    }
  }

  // If that failed and we had a location, try national
  if ((!providerResult || !providerResult.dataPoints) && originalLocation) {
    const nationalResult = await fetchFromCareerOneStop({
      occupationKeyword: trimmedTitle,
      location: "US",
    });
    if (nationalResult && nationalResult.dataPoints) {
      providerResult = nationalResult;
      scope = "national";
      locationUsed = "United States (national)";
    }
  }

  // If we never had a location, go straight to national
  if (!originalLocation && !providerResult) {
    const nationalResult = await fetchFromCareerOneStop({
      occupationKeyword: trimmedTitle,
      location: "US",
    });
    if (nationalResult && nationalResult.dataPoints) {
      providerResult = nationalResult;
      scope = "national";
      locationUsed = "United States (national)";
    }
  }

  // 3️⃣ Build doc to cache (even if no data)
  let docToSave;

  if (!providerResult || !providerResult.dataPoints) {
    // No data at all → cache negative result to avoid repeated failed calls
    const cacheLocationKey =
      originalLocation ? locationKey || nationalKey : nationalKey;

    docToSave = new SalaryBenchmark({
      jobId: jobId || null,
      jobTitleKey: titleKey,
      locationKey: cacheLocationKey,
      displayTitle: trimmedTitle,
      displayLocation: originalLocation || "United States",
      currency: "USD",
      period: "year",
      min: null,
      max: null,
      p10: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      mean: null,
      wageYear: null,
      occupationCode: null,
      sources: [],
      hasData: false,
      scope: "none",
      lastFetchedAt: new Date(),
      raw: null,
    });

    try {
      await docToSave.save();
    } catch (err) {
      console.error("[salary] Failed to cache negative benchmark:", err);
    }

    return mapDocToResponse(docToSave, {
      jobId,
      fallbackTitle: trimmedTitle,
      fallbackLocation: originalLocation,
    });
  }

  // We have provider data → build positive cache entry
  const { dataPoints, meta } = providerResult;

  const finalTitle =
    (meta && meta.occupationTitle) || trimmedTitle;
  const wageYear = meta?.wageYear || null;
  const occupationCode = meta?.occupationCode || null;

  const cacheLocationKey =
    scope === "location"
      ? locationKey || nationalKey
      : nationalKey; // national fallback always keyed by "us"

  const displayLocation =
    scope === "national"
      ? "United States (national)"
      : originalLocation || meta?.nationalAreaName || "United States";

  docToSave = new SalaryBenchmark({
    jobId: jobId || null,
    jobTitleKey: titleKey,
    locationKey: cacheLocationKey,
    displayTitle: finalTitle,
    displayLocation,
    currency: providerResult.currency || "USD",
    period: providerResult.period || "year",

    min: dataPoints.min ?? null,
    max: dataPoints.max ?? null,
    p10: dataPoints.p10 ?? null,
    p25: dataPoints.p25 ?? null,
    p50: dataPoints.p50 ?? null,
    p75: dataPoints.p75 ?? null,
    p90: dataPoints.p90 ?? null,
    mean: dataPoints.mean ?? null,

    wageYear,
    occupationCode,
    sources: [providerResult.source].filter(Boolean),
    hasData: true,
    scope,
    lastFetchedAt: new Date(),
    raw: meta?.raw || null,
  });

  try {
    await docToSave.save();
  } catch (err) {
    console.error("[salary] Failed to cache salary benchmark:", err);
  }

  return mapDocToResponse(docToSave, {
    jobId,
    fallbackTitle: trimmedTitle,
    fallbackLocation: originalLocation,
  });
}
