// server/services/offerComparison.service.js

import OfferComparisonSnapshot from "../models/offerComparisonSnapshot.js";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Match the same key selection strategy used in resume_ai.service.js / coverletter.service.js
const GEMINI_API_KEY =
  process.env.GOOGLE_API_KEY_FOR_FOLLOWUP ||
  process.env.GOOGLE_API_KEY_FOR_WRITINGPRACTICE ||
  process.env.GOOGLE_API_KEY_FOR_RESUME ||
  process.env.GOOGLE_API_KEY_FOR_COVERLETTER;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Preset benefits value (USD/year) used when a job does not have benefitsValue configured.
// This keeps benefits out of the UI while still producing a reasonable total comp.
const DEFAULT_BENEFITS_VALUE = 15000;

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pct(base, p) {
  const b = toNum(base);
  const pp = toNum(p);
  return b * (1 + pp / 100);
}

/**
 * Compute “total comp” using existing job fields:
 * finalSalary + salaryBonus + salaryEquity + benefitsValue
 */
export function computeTotalComp(job, scenario = {}) {
  const salary = pct(toNum(job.finalSalary), scenario.salaryIncreasePct || 0);
  const bonus = pct(toNum(job.salaryBonus), scenario.bonusIncreasePct || 0);
  const equity = pct(toNum(job.salaryEquity), scenario.equityIncreasePct || 0);
  const benefitsBase = toNum(job.benefitsValue) > 0 ? toNum(job.benefitsValue) : DEFAULT_BENEFITS_VALUE;
  const benefits = pct(benefitsBase, scenario.benefitsIncreasePct || 0);

  const total = toNum(salary) + toNum(bonus) + toNum(equity) + toNum(benefits);

  return {
    salary,
    bonus,
    equity,
    benefits,
    total,
  };
}

/**
 * Cost-of-living adjustment:
 * adjusted = total * (baselineIndex / offerIndex)
 * If offerIndex missing/invalid -> treat as baseline (no adjustment).
 */
export function computeColAdjustedTotal(totalComp, offerColIndex, baselineColIndex = 100) {
  const total = toNum(totalComp);
  const offerIdx = toNum(offerColIndex) || baselineColIndex;
  const baseIdx = toNum(baselineColIndex) || 100;
  if (offerIdx <= 0) return total;
  return total * (baseIdx / offerIdx);
}

/**
 * Non-financial scoring (simple 1-5 ratings)
 * Returns 0-100.
 */
export function computeNonFinancialScore(ratings = {}, weights = {}) {
  const wCulture = toNum(weights.cultureFitWeight ?? 1);
  const wGrowth = toNum(weights.growthWeight ?? 1);
  const wWlb = toNum(weights.workLifeBalanceWeight ?? 1);
  const wRemote = toNum(weights.remotePolicyWeight ?? 1);

  const culture = clamp(toNum(ratings.cultureFit ?? 3), 1, 5);
  const growth = clamp(toNum(ratings.growth ?? 3), 1, 5);
  const wlb = clamp(toNum(ratings.workLifeBalance ?? 3), 1, 5);
  const remote = clamp(toNum(ratings.remotePolicy ?? 3), 1, 5);

  const totalW = wCulture + wGrowth + wWlb + wRemote || 1;

  // Normalize 1-5 to 0-100
  const norm = (x) => ((x - 1) / 4) * 100;

  const score =
    (norm(culture) * wCulture +
      norm(growth) * wGrowth +
      norm(wlb) * wWlb +
      norm(remote) * wRemote) / totalW;

  return Math.round(score);
}

/**
 * Overall score combines:
 * - financial score (ranked across offers) scaled 0-100
 * - non-financial score (0-100)
 */
export function buildComparison(jobs, input = {}) {
  const {
    baselineColIndex = 100,
    colIndexByJobId = {},
    scenarioByJobId = {},
    ratingsByJobId = {},
    weights = {
      financialWeight: 0.65, // 65% financial by default
      cultureFitWeight: 1,
      growthWeight: 1,
      workLifeBalanceWeight: 1,
      remotePolicyWeight: 1,
    },
  } = input;

  const financialWeight = clamp(toNum(weights.financialWeight ?? 0.65), 0, 1);

  const computed = jobs.map((job) => {
    const jobId = job._id.toString();
    const scenario = scenarioByJobId[jobId] || {};
    const ratings = ratingsByJobId[jobId] || {};
    const colIndex = colIndexByJobId[jobId] ?? baselineColIndex;

    const comp = computeTotalComp(job, scenario);
    const colAdjustedTotal = computeColAdjustedTotal(comp.total, colIndex, baselineColIndex);
    const nonFinancialScore = computeNonFinancialScore(ratings, weights);

    return {
      jobId,
      company: job.company || "",
      jobTitle: job.jobTitle || "",
      location: job.location || "",
      workMode: job.workMode || "",
      archived: !!job.archived,
      archiveReason: job.archiveReason || "",
      // comp breakdown
      salary: comp.salary,
      bonus: comp.bonus,
      equity: comp.equity,
      benefits: comp.benefits,
      totalComp: comp.total,
      colIndex,
      colAdjustedTotal,
      nonFinancialScore,
      negotiationRecommendations: [], // filled below
    };
  });

  // Financial score: rank by COL-adjusted total comp across selected offers
  const sorted = [...computed].sort((a, b) => b.colAdjustedTotal - a.colAdjustedTotal);
  const max = sorted[0]?.colAdjustedTotal ?? 0;
  const min = sorted[sorted.length - 1]?.colAdjustedTotal ?? 0;
  const range = max - min || 1;

  const withScores = computed.map((o) => {
    const financialScore = Math.round(((o.colAdjustedTotal - min) / range) * 100);
    const overallScore = Math.round(financialScore * financialWeight + o.nonFinancialScore * (1 - financialWeight));
    return { ...o, financialScore, overallScore };
  });

  // Negotiation recommendations (simple, useful heuristics)
  const best = withScores.reduce((acc, cur) => (cur.colAdjustedTotal > acc.colAdjustedTotal ? cur : acc), withScores[0]);
  const bestSalary = Math.max(...withScores.map((x) => toNum(x.salary)));

  const final = withScores.map((o) => {
    const recs = [];
    if (best && o.jobId !== best.jobId) {
      recs.push(`You are behind the top offer on COL-adjusted total comp; consider negotiating to close the gap.`);
    }
    if (toNum(o.salary) < bestSalary) {
      recs.push(`Ask for a base salary increase (target: at least ${Math.round(bestSalary)}).`);
    }
    if (toNum(o.bonus) === 0) recs.push(`Consider requesting a sign-on bonus or annual bonus component.`);
    if (toNum(o.equity) === 0) recs.push(`If equity matters, ask if equity/RSUs are available (or increase grant).`);
    recs.push(`Benefits are estimated (default ${DEFAULT_BENEFITS_VALUE}/yr if not provided). Verify health/401k/PTO details before deciding.`);
    return { ...o, negotiationRecommendations: recs };
  });

  // Side-by-side matrix rows
  const matrixRows = [
    { label: "Base salary", key: "salary" },
    { label: "Bonus", key: "bonus" },
    { label: "Equity (annualized)", key: "equity" },
    { label: "Total comp", key: "totalComp" },
    { label: "COL index", key: "colIndex" },
    { label: "COL-adjusted total", key: "colAdjustedTotal" },
    { label: "Non-financial score", key: "nonFinancialScore" },
    { label: "Financial score", key: "financialScore" },
    { label: "Overall score", key: "overallScore" },
  ];

  return {
    offers: final,
    matrixRows,
  };
}

export async function saveComparisonSnapshot({ userId, name, jobIds, inputs, result }) {
  const doc = await OfferComparisonSnapshot.create({
    userId,
    name: name || "",
    jobIds,
    inputs,
    result,
  });
  return doc.toObject();
}

// List all saved comparisons for a user
export async function listComparisonSnapshots(userId) {
  return OfferComparisonSnapshot.find({ userId })
    .sort({ updatedAt: -1 })
    .select({ name: 1, jobIds: 1, createdAt: 1, updatedAt: 1 })
    .lean();
}

// Get a single comparison by ID
export async function getComparisonSnapshot(userId, id) {
  return OfferComparisonSnapshot.findOne({ _id: id, userId }).lean();
}

// Delete a saved comparison
export async function deleteComparisonSnapshot(userId, id) {
  return OfferComparisonSnapshot.findOneAndDelete({ _id: id, userId }).lean();
}

// =========================
// Career growth projection
// =========================

const careerResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    assumptions: {
      type: SchemaType.OBJECT,
      properties: {
        conservativeAnnualRaisePct: { type: SchemaType.NUMBER },
        expectedAnnualRaisePct: { type: SchemaType.NUMBER },
        optimisticAnnualRaisePct: { type: SchemaType.NUMBER },
        bonusGrowthPct: { type: SchemaType.NUMBER },
        equityGrowthPct: { type: SchemaType.NUMBER },
        benefitsGrowthPct: { type: SchemaType.NUMBER },
        rationale: { type: SchemaType.STRING },
      },
    },
    aiSuggestedMilestones: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          year: { type: SchemaType.NUMBER },
          title: { type: SchemaType.STRING },
          salaryBumpPct: { type: SchemaType.NUMBER },
          bonusBumpPct: { type: SchemaType.NUMBER },
          equityBumpPct: { type: SchemaType.NUMBER },
          benefitsBumpPct: { type: SchemaType.NUMBER },
          note: { type: SchemaType.STRING },
        },
        required: ["year"],
      },
    },
    analysisSummary: { type: SchemaType.STRING },
    recommendation: { type: SchemaType.OBJECT },
  },
};

export async function GenerateOfferCareerProjection(jobs, inputs = {}) {
  // If AI key isn't configured, fall back cleanly.
  if (!genAI) {
    return buildCareerProjectionFallback(jobs, inputs);
  }

  const userScenarios = normalizeScenarioInputs(inputs);
  const userMilestones = normalizeMilestones(inputs?.milestones || inputs?.careerMilestones || []);

  const startCompByJobId = inputs?.startingCompByJobId || {};
  const goalText = String(inputs?.careerGoals || "").trim();
  const salaryGoal = String(inputs?.salaryGoals || "").trim();
  const notes = String(inputs?.notes || inputs?.nonFinancialGoals || "").trim();

  const jobsCtx = (Array.isArray(jobs) ? jobs : []).map((j) => {
    const id = j._id.toString();
    const sc = startCompByJobId?.[id] || {};
    return {
      jobId: id,
      company: j.company || "",
      jobTitle: j.jobTitle || "",
      location: j.location || "",
      workMode: j.workMode || "",
      starting: {
        salary: sc.salary != null ? toNum(sc.salary) : toNum(j.finalSalary),
        bonus: sc.bonus != null ? toNum(sc.bonus) : toNum(j.salaryBonus),
        equity: sc.equity != null ? toNum(sc.equity) : toNum(j.salaryEquity),
        benefits:
          sc.benefits != null
            ? toNum(sc.benefits)
            : (toNum(j.benefitsValue) > 0 ? toNum(j.benefitsValue) : DEFAULT_BENEFITS_VALUE),
      },
    };
  });

  let model;
  try {
    model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction:
      "You are a compensation and career progression analyst.\n" +
      "OUTPUT FORMAT:\n" +
      "- Output STRICT JSON only (no markdown, no prose outside JSON).\n" +
      "- Follow the provided schema.\n" +
      "\n" +
      "GOALS:\n" +
      "- Choose realistic raise assumptions for conservative/expected/optimistic scenarios.\n" +
      "- Consider the job details and the user's goals.\n" +
      "- Suggest optional milestones (promotions/title changes) with timeline impacts.\n" +
      "- Provide a concise recommendation narrative focusing on tradeoffs.\n" +
      "\n" +
      "CONSTRAINTS:\n" +
      "- Do not invent company-specific policies; if unknown, use reasonable assumptions and state rationale.\n" +
      "- Keep numbers plausible (typical annual raises 0–8%, promotion bumps 5–25% depending on seniority).\n" +
      "- Use USD amounts and percentages.\n",
    });
  } catch (err) {
    console.error("Career projection AI model init failed:", err);
    return buildCareerProjectionFallback(jobs, inputs);
  }

  const prompt =
    `=== JOB OFFERS (with starting compensation) ===\n` +
    `${JSON.stringify(jobsCtx, null, 2)}\n\n` +
    `=== USER INPUTS ===\n` +
    `${JSON.stringify(
      {
        userProvidedRaiseScenariosPct: userScenarios,
        userProvidedMilestones: userMilestones,
        careerGoals: goalText,
        salaryGoals: salaryGoal,
        notes,
      },
      null,
      2
    )}\n\n` +
    `TASK:\n` +
    `1) Provide raise assumptions for conservative/expected/optimistic scenarios (annual raise % for base salary).\n` +
    `2) Provide bonus/equity/benefits growth % assumptions (annual).\n` +
    `3) Suggest optional additional milestones (promotions/title changes) that are plausible given the titles.\n` +
    `4) Provide an analysis summary and recommendation by jobId.\n` +
    `IMPORTANT: If the user provided scenario raise %, use them unless they are clearly invalid.\n`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: careerResponseSchema,
      },
    });

    const raw =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.response?.text ||
      "";

    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Career projection AI JSON parse failed:", e, raw);
      return buildCareerProjectionFallback(jobs, inputs);
    }

    const aiAssumptions = parsed?.assumptions || {};
    const aiMilestones = normalizeMilestones(parsed?.aiSuggestedMilestones || []);

    const norm = normalizeScenarioInputs({
      ...inputs,
      raiseScenarios: {
        conservativePct:
          inputs?.raiseScenarios?.conservativePct != null
            ? inputs.raiseScenarios.conservativePct
            : safePct(aiAssumptions.conservativeAnnualRaisePct, userScenarios.conservativePct),
        expectedPct:
          inputs?.raiseScenarios?.expectedPct != null
            ? inputs.raiseScenarios.expectedPct
            : safePct(aiAssumptions.expectedAnnualRaisePct, userScenarios.expectedPct),
        optimisticPct:
          inputs?.raiseScenarios?.optimisticPct != null
            ? inputs.raiseScenarios.optimisticPct
            : safePct(aiAssumptions.optimisticAnnualRaisePct, userScenarios.optimisticPct),
      },
      bonusGrowthPct:
        inputs?.bonusGrowthPct != null ? inputs.bonusGrowthPct : safePct(aiAssumptions.bonusGrowthPct, userScenarios.bonusGrowthPct),
      equityGrowthPct:
        inputs?.equityGrowthPct != null ? inputs.equityGrowthPct : safePct(aiAssumptions.equityGrowthPct, userScenarios.equityGrowthPct),
      benefitsGrowthPct:
        inputs?.benefitsGrowthPct != null ? inputs.benefitsGrowthPct : safePct(aiAssumptions.benefitsGrowthPct, userScenarios.benefitsGrowthPct),
    });

    // Combine: user's explicit milestones take priority; append AI suggestions for additional context.
    const combinedMilestones = [...userMilestones, ...aiMilestones].slice(0, 20);

    const computed = buildCareerProjectionFallback(jobs, {
      ...inputs,
      raiseScenarios: {
        conservativePct: norm.conservativePct,
        expectedPct: norm.expectedPct,
        optimisticPct: norm.optimisticPct,
      },
      bonusGrowthPct: norm.bonusGrowthPct,
      equityGrowthPct: norm.equityGrowthPct,
      benefitsGrowthPct: norm.benefitsGrowthPct,
      milestones: combinedMilestones,
    });

    return {
      ...computed,
      assumptions: {
        source: "ai",
        expectedAnnualRaisePct: round2(norm.expectedPct),
        conservativeAnnualRaisePct: round2(norm.conservativePct),
        optimisticAnnualRaisePct: round2(norm.optimisticPct),
        bonusGrowthPct: round2(norm.bonusGrowthPct),
        equityGrowthPct: round2(norm.equityGrowthPct),
        benefitsGrowthPct: round2(norm.benefitsGrowthPct),
        rationale: String(aiAssumptions?.rationale || "").trim(),
      },
      milestones: combinedMilestones,
      analysisSummary: String(parsed?.analysisSummary || computed.analysisSummary || "").trim(),
      recommendation: parsed?.recommendation || null,
    };
  } catch (err) {
    const msg = String(err?.message || err);
    const status = err?.status || err?.code || err?.statusCode;

    // Quota / rate-limit fallback
    if (status === 429 || /rate|quota|exceed/i.test(msg)) {
      return buildCareerProjectionFallback(jobs, inputs);
    }

    console.error("Career projection AI failed:", err);
    return buildCareerProjectionFallback(jobs, inputs);
  }
}

// -------------------------
// Fallback computation (no AI)
// -------------------------

function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function safePct(value, fallback = 0, min = 0, max = 25) {
  const v = Number(value);
  const fb = Number(fallback);
  const use = Number.isFinite(v) ? v : Number.isFinite(fb) ? fb : 0;
  return clamp(use, min, max);
}

function normalizeScenarioInputs(inputs = {}) {
  const rs = inputs?.raiseScenarios || {};
  return {
    conservativePct: safePct(rs.conservativePct, 2, 0, 20),
    expectedPct: safePct(rs.expectedPct, 3, 0, 20),
    optimisticPct: safePct(rs.optimisticPct, 5, 0, 20),
    // Defaults kept flat (0%) unless user explicitly sets them.
    bonusGrowthPct: safePct(inputs?.bonusGrowthPct, 0, 0, 25),
    equityGrowthPct: safePct(inputs?.equityGrowthPct, 0, 0, 25),
    benefitsGrowthPct: safePct(inputs?.benefitsGrowthPct, 0, 0, 25),
  };
}

function normalizeMilestones(list = []) {
  const arr = Array.isArray(list) ? list : [];
  const out = arr
    .map((m) => {
      const year = Math.round(toNum(m?.year));
      const y = clamp(year, 1, 10);
      return {
        year: y,
        title: m?.title != null ? String(m.title) : undefined,
        salaryBumpPct: m?.salaryBumpPct != null ? safePct(m.salaryBumpPct, 0, 0, 30) : undefined,
        bonusBumpPct: m?.bonusBumpPct != null ? safePct(m.bonusBumpPct, 0, 0, 30) : undefined,
        equityBumpPct: m?.equityBumpPct != null ? safePct(m.equityBumpPct, 0, 0, 30) : undefined,
        benefitsBumpPct: m?.benefitsBumpPct != null ? safePct(m.benefitsBumpPct, 0, 0, 30) : undefined,
        note: m?.note != null ? String(m.note) : undefined,
      };
    })
    .filter((m) => Number.isFinite(m.year));

  // sort by year then stable
  out.sort((a, b) => a.year - b.year);
  return out;
}

function applyAnnualRaise(value, pctRaise) {
  return pct(toNum(value), toNum(pctRaise));
}

function applyBump(value, bumpPct) {
  return pct(toNum(value), toNum(bumpPct));
}

function buildTimeline({
  years,
  start,
  raisePct,
  bonusGrowthPct,
  equityGrowthPct,
  benefitsGrowthPct,
  milestones,
  initialTitle,
}) {
  const ys = Array.from({ length: years + 1 }).map((_, i) => i);

  const salary = [];
  const bonus = [];
  const equity = [];
  const benefits = [];
  const totalComp = [];
  const titleByYear = [];

  let curSalary = toNum(start.salary);
  let curBonus = toNum(start.bonus);
  let curEquity = toNum(start.equity);
  let curBenefits = toNum(start.benefits);
  if (curBenefits <= 0) curBenefits = DEFAULT_BENEFITS_VALUE;

  let curTitle = initialTitle || "";

  const msByYear = new Map();
  (milestones || []).forEach((m) => {
    const y = clamp(Math.round(toNum(m.year)), 1, 10);
    if (!msByYear.has(y)) msByYear.set(y, []);
    msByYear.get(y).push(m);
  });

  for (const y of ys) {
    if (y > 0) {
      // Annual growth applied first
      curSalary = applyAnnualRaise(curSalary, raisePct);
      curBonus = applyAnnualRaise(curBonus, bonusGrowthPct);
      curEquity = applyAnnualRaise(curEquity, equityGrowthPct);
      curBenefits = applyAnnualRaise(curBenefits, benefitsGrowthPct);

      // Then milestone bumps for that year (promotion, title change, etc.)
      const ms = msByYear.get(y) || [];
      for (const m of ms) {
        if (m.salaryBumpPct != null) curSalary = applyBump(curSalary, m.salaryBumpPct);
        if (m.bonusBumpPct != null) curBonus = applyBump(curBonus, m.bonusBumpPct);
        if (m.equityBumpPct != null) curEquity = applyBump(curEquity, m.equityBumpPct);
        if (m.benefitsBumpPct != null) curBenefits = applyBump(curBenefits, m.benefitsBumpPct);
        if (m.title) curTitle = String(m.title);
      }
    }

    salary.push(Math.round(curSalary));
    bonus.push(Math.round(curBonus));
    equity.push(Math.round(curEquity));
    benefits.push(Math.round(curBenefits));
    totalComp.push(Math.round(curSalary + curBonus + curEquity + curBenefits));
    titleByYear.push(curTitle);
  }

  return {
    years: ys,
    salary,
    bonus,
    equity,
    benefits,
    totalComp,
    titleByYear,
  };
}

function buildCareerProjectionFallback(jobs, inputs = {}) {
  const scenarios = normalizeScenarioInputs(inputs);
  const milestones = normalizeMilestones(inputs?.milestones || inputs?.careerMilestones || []);
  const startCompByJobId = inputs?.startingCompByJobId || {};

  const scenarioDefs = [
    { key: "conservative", label: "Conservative", raisePct: scenarios.conservativePct },
    { key: "expected", label: "Expected", raisePct: scenarios.expectedPct },
    { key: "optimistic", label: "Optimistic", raisePct: scenarios.optimisticPct },
  ];

  const projectedJobs = (Array.isArray(jobs) ? jobs : []).map((j) => {
    const jobId = j._id.toString();
    const sc = startCompByJobId?.[jobId] || {};

    const starting = {
      salary: sc.salary != null ? toNum(sc.salary) : toNum(j.finalSalary),
      bonus: sc.bonus != null ? toNum(sc.bonus) : toNum(j.salaryBonus),
      equity: sc.equity != null ? toNum(sc.equity) : toNum(j.salaryEquity),
      benefits:
        sc.benefits != null
          ? toNum(sc.benefits)
          : (toNum(j.benefitsValue) > 0 ? toNum(j.benefitsValue) : DEFAULT_BENEFITS_VALUE),
    };

    const scens = scenarioDefs.map((sd) => {
      const five = buildTimeline({
        years: 5,
        start: starting,
        raisePct: sd.raisePct,
        bonusGrowthPct: scenarios.bonusGrowthPct,
        equityGrowthPct: scenarios.equityGrowthPct,
        benefitsGrowthPct: scenarios.benefitsGrowthPct,
        milestones,
        initialTitle: j.jobTitle || "",
      });

      const ten = buildTimeline({
        years: 10,
        start: starting,
        raisePct: sd.raisePct,
        bonusGrowthPct: scenarios.bonusGrowthPct,
        equityGrowthPct: scenarios.equityGrowthPct,
        benefitsGrowthPct: scenarios.benefitsGrowthPct,
        milestones,
        initialTitle: j.jobTitle || "",
      });

      return {
        key: sd.key,
        label: sd.label,
        annualRaisePct: sd.raisePct,
        bonusGrowthPct: scenarios.bonusGrowthPct,
        equityGrowthPct: scenarios.equityGrowthPct,
        benefitsGrowthPct: scenarios.benefitsGrowthPct,
        fiveYear: five,
        tenYear: ten,
        fiveYearEndingSalary: five.salary[five.salary.length - 1] || 0,
        tenYearEndingSalary: ten.salary[ten.salary.length - 1] || 0,
        fiveYearEndingTotalComp: five.totalComp[five.totalComp.length - 1] || 0,
        tenYearEndingTotalComp: ten.totalComp[ten.totalComp.length - 1] || 0,
      };
    });

    return {
      jobId,
      company: j.company || "",
      jobTitle: j.jobTitle || "",
      location: j.location || "",
      workMode: j.workMode || "",
      scenarios: scens,
    };
  });

  // Lightweight summary for UX
  const expectedKey = "expected";
  const best = projectedJobs
    .map((j) => {
      const sc = j.scenarios?.find((s) => s.key === expectedKey) || j.scenarios?.[0];
      return {
        jobId: j.jobId,
        label: `${j.company} — ${j.jobTitle}`.trim(),
        fiveEnd: toNum(sc?.fiveYearEndingTotalComp),
      };
    })
    .sort((a, b) => b.fiveEnd - a.fiveEnd)[0];

  const analysisSummary = best
    ? `Based on the expected raise scenario, the highest projected 5-year ending total compensation is ${best.label}. Adjust raise assumptions and milestones to explore trade-offs.`
    : "Adjust raise assumptions and milestones to explore trade-offs.";

  return {
    assumptions: {
      source: "fallback",
      conservativeAnnualRaisePct: round2(scenarios.conservativePct),
      expectedAnnualRaisePct: round2(scenarios.expectedPct),
      optimisticAnnualRaisePct: round2(scenarios.optimisticPct),
      bonusGrowthPct: round2(scenarios.bonusGrowthPct),
      equityGrowthPct: round2(scenarios.equityGrowthPct),
      benefitsGrowthPct: round2(scenarios.benefitsGrowthPct),
      rationale:
        "Fallback projection used. Base salary raises follow the selected scenario. Bonus/equity/benefits are held flat by default unless you provide growth rates or milestones.",
    },
    milestones,
    jobs: projectedJobs,
    analysisSummary,
    recommendation: null,
  };
}