// services/salaryProviders/blsProvider.js
import fetch from "node-fetch";

const CAREERONESTOP_USER_ID = process.env.CAREERONESTOP_USER_ID;
const CAREERONESTOP_API_KEY = process.env.CAREERONESTOP_API_KEY;
const CAREERONESTOP_BASE_URL =
  process.env.CAREERONESTOP_BASE_URL || "https://api.careeronestop.org/v1";

/**
 * Find best O*NET match from an OccupationList using a hybrid similarity.
 *
 * @param {Array<{OnetTitle: string, OnetCode: string}>} originalArray
 * @param {string} text
 * @param {number} [minScore]
 * @returns {{OnetTitle: string, OnetCode: string} | null}
 */
function bestOnetMatch(originalArray, text, minScore = 0.3) {
  if (!Array.isArray(originalArray) || !text) return null;

  // -------------------------
  // Normalization
  // -------------------------
  function normalize(s) {
    return s
      .toLowerCase()
      .replace(/[^\w\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // -------------------------
  // Jaccard similarity (token-level)
  // -------------------------
  function jaccardTokenSimilarity(a, b) {
    const tokensA = a.split(" ").filter(Boolean);
    const tokensB = b.split(" ").filter(Boolean);

    if (tokensA.length === 0 && tokensB.length === 0) return 0.0;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    let intersection = 0;
    for (const word of setA) {
      if (setB.has(word)) intersection++;
    }

    const unionSize = new Set([...setA, ...setB]).size;
    return unionSize === 0 ? 0.0 : intersection / unionSize;
  }

  // -------------------------
  // Character similarity (very rough SequenceMatcher-like)
  // -------------------------
  function charSimilarity(a, b) {
    if (!a && !b) return 0.0;

    const len = Math.min(a.length, b.length);
    if (len === 0) return 0.0;

    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] === b[i]) matches++;
    }

    return matches / Math.max(a.length, b.length);
  }

  // -------------------------
  // Combined similarity
  // -------------------------
  function combinedSimilarity(a, b) {
    const na = normalize(a);
    const nb = normalize(b);

    if (!na && !nb) return 0.0;

    const tokenScore = jaccardTokenSimilarity(na, nb);
    const charScore = charSimilarity(na, nb);

    let score = 0.45 * tokenScore + 0.55 * charScore;

    // Bonus if one is a substring of the other
    if (na && nb && (na.includes(nb) || nb.includes(na))) {
      score += 0.15;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  // -------------------------
  // Pick best match from objects
  // -------------------------
  const normText = normalize(text);
  if (!normText) return null;

  let bestScore = 0.0;
  let bestObj = null;

  for (const obj of originalArray) {
    const title = obj?.OnetTitle;
    if (!title) continue;

    const score = combinedSimilarity(title, normText);

    if (score > bestScore) {
      bestScore = score;
      bestObj = obj;
    }
  }

  if (bestObj && bestScore >= minScore) {
    return {
      OnetTitle: bestObj.OnetTitle,
      OnetCode: bestObj.OnetCode,
    };
  }

  return null;
}

/**
 * Wrap CareerOneStop "salary" endpoint (OEWS data).
 *
 * @param {Object} params
 * @param {string} params.occupationKeyword - e.g. "Software Developer"
 * @param {string} params.location          - e.g. "New York, NY" or "US"
 */
export async function fetchFromCareerOneStop({ occupationKeyword, location }) {
  if (!CAREERONESTOP_USER_ID || !CAREERONESTOP_API_KEY) {
    console.warn(
      "[salary] CareerOneStop credentials missing. CAREERONESTOP_USER_ID / CAREERONESTOP_API_KEY not set."
    );
    return null;
  }

  const keyword = (occupationKeyword || "").trim();
  const loc = (location || "").trim() || "US";

  // -------------------------
  // 1) Get O*NET occupation match
  // -------------------------

  // 🔒 Do not change this URL (per your note)
  const occupationCodeurl = `${CAREERONESTOP_BASE_URL}occupation/${CAREERONESTOP_USER_ID}/${encodeURIComponent(
    keyword
  )}/N/0/10?datasettype=onet&searchby=0`;

  let occupationResponse;
  try {
    occupationResponse = await fetch(occupationCodeurl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CAREERONESTOP_API_KEY}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    console.error("[occupation] Error calling CareerOneStop:", err);
    // We can still try salary with the raw keyword
    occupationResponse = null;
  }

  let resolvedTitle = keyword;

  if (occupationResponse && occupationResponse.ok) {
    const dataoccup = await occupationResponse.json().catch((err) => {
      console.error("[occupation] Error parsing CareerOneStop JSON:", err);
      return null;
    });

    const occList = dataoccup?.OccupationList || [];
    if (!Array.isArray(occList) || occList.length === 0) {
      console.warn("[occupation] CareerOneStop: empty OccupationList.");
    } else {
      const best = bestOnetMatch(occList, keyword);
      if (best && best.OnetTitle) {
        resolvedTitle = best.OnetTitle;
      }
    }
  } else if (occupationResponse && !occupationResponse.ok) {
    const text = await occupationResponse.text().catch(() => "");
    console.error(
      "[occupation] CareerOneStop error:",
      occupationResponse.status,
      occupationResponse.statusText,
      text
    );
    // fall back to keyword
  }

  // -------------------------
  // 2) Get salary / wage data
  // -------------------------

  // 🔒 Do not change this URL (per your note)
  const salaryurl = `${CAREERONESTOP_BASE_URL}comparesalaries/${CAREERONESTOP_USER_ID}/wage?keyword=${encodeURIComponent(
    resolvedTitle || keyword
  )}&location=${encodeURIComponent(loc)}&enableMetaData=${true}
`;

  let response;
  try {
    response = await fetch(salaryurl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CAREERONESTOP_API_KEY}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    console.error("[salary] Error calling CareerOneStop:", err);
    return null;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(
      "[salary] CareerOneStop error:",
      response.status,
      response.statusText,
      text
    );
    return null;
  }

  const data = await response.json().catch((err) => {
    console.error("[salary] Error parsing CareerOneStop JSON:", err);
    return null;
  });

  if (!data || !data.OccupationDetail) {
    console.warn("[salary] CareerOneStop: missing OccupationDetail.");
    return null;
  }

  const occ = data.OccupationDetail;
  const wages = occ.Wages || {};

  const stateList = wages.StateWagesList || [];
  const nationalList = wages.NationalWagesList || [];

  let annualEntry;

  // Prefer state-level annual if available; otherwise national annual
  if (stateList.length > 0) {
    annualEntry =
      stateList.find((w) => w.RateType === "Annual") || stateList[0];
  } else {
    annualEntry =
      nationalList.find((w) => w.RateType === "Annual") || nationalList[0];
  }

  if (!annualEntry) {
    console.warn("[salary] CareerOneStop: no Annual wages entries.");
    return null;
  }

  const parseNum = (v) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v))
      ? undefined
      : Number(v);

  const p10 = parseNum(annualEntry.Pct10);
  const p25 = parseNum(annualEntry.Pct25);
  const p50 = parseNum(annualEntry.Median);
  const p75 = parseNum(annualEntry.Pct75);
  const p90 = parseNum(annualEntry.Pct90);

  // For min/max we can conservatively use 10th & 90th percentiles
  const min = p10 ?? p25 ?? undefined;
  const max = p90 ?? p75 ?? undefined;

  const wageYear = wages.WageYear || null;

  return {
    source: "bls-careerOneStop",
    currency: "USD",
    period: "year",
    dataPoints: {
      min,
      max,
      p10,
      p25,
      p50,
      p75,
      p90,
      mean: undefined, // no mean in current structure
    },
    meta: {
      occupationTitle: occ.OccupationTitle,
      occupationCode: occ.OccupationCode,
      wageYear,
      nationalAreaName: annualEntry.AreaName,
      request: occ.Request || null,
      rawMeta: data.MetaData || null,
      raw: data, // keep full payload for debugging if needed
    },
  };
}
