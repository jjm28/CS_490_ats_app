// services/customReport.service.js
import { getAllJobs as getUserJobs } from "./jobs.service.js";
import { getUpcomingInterviewPredictions as getInterviewPredictions } from "./interviewSuccessPrediction.service.js";
import { computeSuccessAnalysis } from "./successAnalysis.service.js";
import { listSnapshots } from "./successSnapshot.service.js";
import { computeCompetitiveAnalysis } from "./competitiveAnalysis.service.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Jobs from "../models/jobs.js";
import { getUpcomingInterviewPredictions as getInterviewsByUser } from "./interviewSuccessPrediction.service.js";

function ensureExportsDir() {
  const exportDir = path.resolve("./exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  return exportDir;
}

export async function generateCustomReport(userId, filters = {}, options = {}) {
  const { startDate, endDate, companies, roles, industries, metrics } = filters;
  const { format = "json", template = "default", suggestFilters = true } = options;

  // 🔹 Helper to auto-suggest filters based on user’s jobs and interviews
  async function suggestBestFilters(userId) {
    const jobs = await getUserJobs(userId, { startDate, endDate });
    const interviews = await getInterviewPredictions(userId, { startDate, endDate });

    const industrySet = new Set(jobs.map(j => j.industry).filter(Boolean));
    const roleSet = new Set(jobs.map(j => j.roleTitle || j.title).filter(Boolean));
    const companySet = new Set(jobs.map(j => j.companyName || j.company).filter(Boolean));

    const metricsDefault = ["applications", "interviews", "offers", "conversionRate"];

    return {
      industries: Array.from(industrySet).slice(0, 5),
      roles: Array.from(roleSet).slice(0, 5),
      companies: Array.from(companySet).slice(0, 5),
      metrics: metricsDefault,
    };
  }

  // 🧭 If user didn’t specify filters, fill in with intelligent suggestions
  let activeFilters = { industries, roles, companies, metrics };
  if (suggestFilters) {
    const suggested = await suggestBestFilters(userId);
    activeFilters = {
      industries: industries?.length ? industries : suggested.industries,
      roles: roles?.length ? roles : suggested.roles,
      companies: companies?.length ? companies : suggested.companies,
      metrics: metrics?.length ? metrics : suggested.metrics,
    };
  }

  // 1️⃣ Core data sources
  const [jobs, interviews, overview, snapshots, competitive] = await Promise.all([
    getUserJobs(userId, { startDate, endDate }),
    getInterviewPredictions(userId, { startDate, endDate }),
    computeSuccessAnalysis(userId, { startDate, endDate }),
    listSnapshots(userId, { limit: 30 }),
    computeCompetitiveAnalysis(userId),
  ]);

  // 2️⃣ Build a unified dataset
  const totalApps = jobs?.length || 0;
  const interviewsDone = interviews?.length || 0;
  const offers = jobs?.filter((j) => j.status === "offer").length || 0;
  const conversionRate = totalApps > 0 ? ((offers / totalApps) * 100).toFixed(1) : 0;

  const reportData = {
    summary: {
      userId,
      timeRange: { startDate, endDate },
      filters: activeFilters, // ✅ include active filter set in report
      totals: {
        applications: totalApps,
        interviews: interviewsDone,
        offers,
        conversionRate,
      },
      industries: overview?.analysis?.byIndustry || [],
      roleTypes: overview?.analysis?.byRoleType || [],
      methods: overview?.analysis?.byMethod || [],
      sources: overview?.analysis?.bySource || [],
    },
    insights: {
      successPatterns: overview?.analysis?.successVsRejected || {},
      predictions: interviews || [],
      recommendations: [
        ...(competitive?.recommendations || []),
        ...(overview?.analysis?.timingPatterns?.recommendations || []),
      ],
    },
    competitive,
    snapshots,
    jobs,
    interviews,
  };

  // 3️⃣ Generate export based on requested format
  if (format === "pdf") return await generatePDFReport(reportData, userId, template);
  if (format === "excel") return await generateExcelReport(reportData, userId, template);

  return reportData;
}

// --------------- PDF ---------------
async function generatePDFReport(data, userId, template) {
  const exportDir = ensureExportsDir();
  const filePath = path.join(exportDir, `custom-report-${userId}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("Custom Job Search & Interview Report", { align: "center" });
  doc.moveDown().fontSize(12);
  doc.text(`Template: ${template}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  const { summary, insights } = data;

  doc.text(`Applications: ${summary.totals.applications}`);
  doc.text(`Interviews: ${summary.totals.interviews}`);
  doc.text(`Offers: ${summary.totals.offers}`);
  doc.text(`Conversion Rate: ${summary.totals.conversionRate}%`);
  doc.moveDown();

  doc.font("Helvetica-Bold").text("Top Insights:");
  if (insights.recommendations?.length) {
    insights.recommendations.forEach((r) => doc.font("Helvetica").text(`• ${r}`));
  } else {
    doc.text("No recommendations available.");
  }

  doc.end();
  return { path: `/exports/custom-report-${userId}.pdf`, format: "pdf" };
}

// --------------- Excel ---------------
async function generateExcelReport(data, userId, template) {
  const exportDir = ensureExportsDir();
  const filePath = path.join(exportDir, `custom-report-${userId}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Job Report");

  // Summary
  sheet.addRow(["Metric", "Value"]);
  sheet.addRow(["Applications", data.summary.totals.applications]);
  sheet.addRow(["Interviews", data.summary.totals.interviews]);
  sheet.addRow(["Offers", data.summary.totals.offers]);
  sheet.addRow(["Conversion Rate (%)", data.summary.totals.conversionRate]);
  sheet.addRow([]);
  sheet.addRow(["Generated", new Date().toLocaleString()]);
  sheet.addRow(["Template", template]);
  sheet.addRow([]);

  // Recommendations
  sheet.addRow(["Recommendations"]);
  (data.insights.recommendations || []).forEach((r) => sheet.addRow(["•", r]));

  // Jobs overview
  sheet.addRow([]);
  sheet.addRow(["Jobs"]);
  (data.jobs || []).forEach((j) =>
    sheet.addRow([j.company, j.role, j.status, j.industry || "N/A"])
  );

  await workbook.xlsx.writeFile(filePath);
  return { path: `/exports/custom-report-${userId}.xlsx`, format: "excel" };
}

async function suggestBestFilters(userId) {
  const jobs = await Jobs.find({ userId }).lean();
  const interviews = await getInterviewsByUser(userId);

  const industries = [...new Set(jobs.map(j => j.industry).filter(Boolean))];
  const roles = [...new Set(jobs.map(j => j.roleTitle).filter(Boolean))];
  const companies = [...new Set(jobs.map(j => j.companyName).filter(Boolean))];

  const metrics = ["applications", "interviews", "offers", "conversionRate"];

  // Rank most relevant filters
  const ranked = {
    industries: industries.slice(0, 5),
    roles: roles.slice(0, 5),
    companies: companies.slice(0, 5),
    metrics,
  };

  return ranked;
}

export async function getJobFilterSummary(userId) {
  const jobs = await Jobs.find({ userId }).lean();
  if (!jobs.length) return { industries: [], roles: [], companies: [], stats: {} };

  const industries = Array.from(new Set(jobs.map(j => j.industry).filter(Boolean)));
  const roles = Array.from(new Set(jobs.map(j => j.jobTitle).filter(Boolean)));
  const companies = Array.from(new Set(jobs.map(j => j.company).filter(Boolean)));

  // Aggregate success stats
  const stats = {
    totalApplications: jobs.length,
    totalInterviews: 0,
    totalOffers: 0,
    byIndustry: {},
    byRole: {},
    byCompany: {}
  };

  for (const job of jobs) {
    const { industry, jobTitle, company, status } = job;

    const addTo = (bucket, key) => {
      if (!key) return;
      if (!bucket[key]) bucket[key] = { applications: 0, interviews: 0, offers: 0 };
      bucket[key].applications++;
      if (status === "interview" || status === "phone_screen") bucket[key].interviews++;
      if (status === "offer") bucket[key].offers++;
    };

    stats.totalInterviews +=
      status === "interview" || status === "phone_screen" ? 1 : 0;
    stats.totalOffers += status === "offer" ? 1 : 0;

    addTo(stats.byIndustry, industry);
    addTo(stats.byRole, jobTitle);
    addTo(stats.byCompany, company);
  }

  // Compute conversion rates
  const computeRate = (obj) => {
    for (const k in obj) {
      const d = obj[k];
      d.interviewRate = d.applications
        ? Math.round((d.interviews / d.applications) * 100)
        : 0;
      d.offerRate = d.interviews
        ? Math.round((d.offers / d.interviews) * 100)
        : 0;
    }
  };
  computeRate(stats.byIndustry);
  computeRate(stats.byRole);
  computeRate(stats.byCompany);

  return { industries, roles, companies, stats };
}
