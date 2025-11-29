// server/services/companyResearch.service.js

// Normalize sizes from Gemini/Google results
export function normalizeCompanySize(sizeString) {
  if (!sizeString) return "Unknown";
  if (typeof sizeString !== "string") return "Unknown";

  const lower = sizeString.toLowerCase();

  // Match textual buckets
  if (lower.includes("1-10") || lower.includes("small")) return "Startup (1–50)";
  if (lower.includes("50") || lower.includes("100") || lower.includes("mid")) return "Mid-size (51–500)";
  if (lower.includes("500") || lower.includes("1000") || lower.includes("large")) return "Enterprise (500+)";
  
  // Try numeric extraction
  const numeric = parseInt(sizeString.replace(/[^0-9]/g, ""));
  if (!numeric) return "Unknown";

  if (numeric <= 50) return "Startup (1–50)";
  if (numeric <= 500) return "Mid-size (51–500)";
  return "Enterprise (500+)";
}