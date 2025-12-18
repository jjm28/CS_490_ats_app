import "./config/env.js";
import logger from "./config/logger.js";
import express from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// 🧠 DB / Core Services
import { connectDB } from "./db/connection.js";
import { ensureSystemTemplates } from "./services/templates.service.js";
import { startAutomationRunner } from "./utils/automationRunner.js";
import { setupNotificationCron, setupApplicationSchedulerCron } from "./jobs/notificationcron.js";
import { setupSalaryRefreshCron } from "./services/salaryRefreshCron.js";
import { setupGitHubSyncCron } from "./services/githubSyncJob.js";

// 🧩 Middleware
import { attachDevUser } from "./middleware/devUser.js";
import { attachUserFromHeaders } from "./middleware/auth.js";
//
// ===============================
// 📁 FEATURE IMPORTS (Grouped)
// ===============================
//

// 🔐 AUTH / USER
import auth from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import profilePhoto from "./routes/profile-photo.js";
import education from "./routes/education.js";
import employmentRouter from "./routes/employment.js";

// 📌 CORE USER RECORDS + SKILLS
import records from "./routes/record.js";
import skills from "./routes/skills.js";

// 📂 PROJECTS & CERTIFICATIONS
import projectsRoutes from "./routes/projects.js";
import projectMediaRoutes from "./routes/project-media.js";
import certificationRoutes from "./routes/certifications.js";

// 💼 JOBS & SALARY
import jobRoutes from "./routes/jobs.js";
import jobSalaryRoutes from "./routes/jobs-salary.js";
import salaryRoutes from "./routes/salary.js";
import salaryAnalyticsRoutes from "./routes/salary-analytics.js";

// 📊 INTERVIEW & COMPANY RESEARCH
import interviewRoutes from "./routes/interview-insights.js";
import interviewAnalyticsRoutes from "./routes/interviews.js";
import companyResearch from "./routes/company-research.js";
import interviewQuestions from "./routes/interview-questions.js";
import coachingInsights from "./routes/coachinginsights.js";
import practiceSessions from "./routes/practicesession.js";
import writingPracticeRoutes from "./routes/writingPractice.js";
import interviewPredictionRoutes from "./routes/interview-success-prediction.js";

// 📄 RESUME + COVER LETTERS
import coverletter from "./routes/coverletter.js";
import resumesRoute from "./routes/resume.js";
import templatesRoute from "./routes/templates.js";
import resumeVersionsRouter from "./routes/resume-versions.js";
import coverletterVersionsRouter from "./routes/coverletter-versions.js";

// ⚙️ AUTOMATION
import automationRoutes from "./routes/automation.js";

// 🔔 NOTIFICATIONS
import notificationRoutes from "./routes/notifications.js";

// 👥 NETWORKING
import reference from "./routes/reference.js";
import peergroups from "./routes/peerGroups.js";
import supportersRoutes from "./routes/supporters.js";
import networkingRoutes from "./routes/networking.js";
import outreachRoutes from "./routes/outreach.js";
import advisorRoutes from "./routes/advisor.routes.js";
import linkedinRoutes from "./routes/linkedin.js";
import informationalRoutes from "./routes/informational.js";

// 🎯 GOALS & PRODUCTIVITY
import goalsRoutes from "./routes/goals.js";
import smartGoalsRoutes from "./routes/smartGoals.js";
import productivityRoutes from "./routes/productivity.js";

// 📈 ANALYTICS / SUCCESS METRICS
import successAnalysisRouter from "./routes/success-analysis.js";
import successPatternsRouter from "./routes/success-patterns.js";
import competitiveAnalysisRouter from "./routes/competitive-analysis.js";

import jobSearchSharingRoutes from "./routes/jobSearchSharing.routes.js";
//import networkingRoutes from "./routes/networking.js";
//import outreachRoutes from "./routes/outreach.js";
import cohortRoutes from "./routes/cohort.routes.js";
import enterpriseRoutes from "./routes/enterprise.routes.js";
import jobseekersRoutes from "./routes/jobseekers.route.js";
import organizationRoutes from "./routes/organization.routes.js";

import teamProgressRouter from "./routes/teamProgress.js";

//import networkingRoutes from "./routes/networking.js";
//import outreachRoutes from "./routes/outreach.js";
//import referralSources from "./routes/referralSources.js";
//import referralRoutes from "./routes/referrals.js";

import networkingDiscovery from "./routes/networkingDiscovery.js";
import mentorRoutes from "./routes/mentor.routes.js";
import teamRoutes from "./routes/teams.js";
import referralRoutes from "./routes/referrals.js";
import marketRoutes from "./routes/market.js";

import successOverview from "./routes/success-overview.js";
import successSnapshots from "./routes/success-snapshots.js";
import customReportsRouter from "./routes/customReports.js";

import githubRoutes from "./routes/github.js";
import certificationBadgeRouter from "./routes/certification-badge.js";
import csrfProtection from "./middleware/csrf.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import helmet from "helmet";
import metricsRouter from "./routes/metrics.js";



import applicationMaterialsRouter from "./routes/application-materials.js";
import applicationMethodsRouter from "./routes/application-methods.js";
import applicationTimingRouter from "./routes/application-timing.js";

import applicationQualityRoutes from "./routes/application-quality.js";
import applicationSchedulerRoutes from "./routes/applicationScheduler.js";
import applicationImportRoutes from "./routes/applicationImport.js";
import applicationSchedulerRoutes from "./routes/applicationScheduler.js";
import applicationImportRoutes from "./routes/applicationImport.js";

import offersRouter from "./routes/offers.js";



//
// ===============================
// 🔧 SERVER CONFIG
// ===============================
const PORT = process.env.PORT || 5050;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
const DB = process.env.DB_NAME || "appdb";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser()); // ⬅️ MUST come BEFORE csurf


app.use("/exports", express.static(path.join(__dirname, "exports")));

app.set("baseUrl", BASE);

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-dev-user-id",
      "x-user-role",
      "x-org-id",
      "x-csrf-token",
    ],}));

    app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_ORIGIN || "http://localhost:5173"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
  })
);


app.use(sanitizeInput);
app.use("/api/metrics", metricsRouter);
// Health check endpoint (for load testing & monitoring)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});



// ===============================
// 📸 STATIC UPLOADS
// ===============================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    setHeaders: (res) => res.set("Cache-Control", "no-store"),
  })
);

//
// ===============================
// 🚀 START AFTER DB CONNECTS
// ===============================
try {
  logger.info("🔌 Connecting to database...");
  await connectDB();
  logger.info("✅ Database connected successfully");

  logger.info("📋 Ensuring system templates...");
  await ensureSystemTemplates();
  logger.info("✅ System templates ready");

  logger.info("🤖 Starting automation runner...");
  startAutomationRunner();
  logger.info("✅ Automation runner started");

  //
  // ===============================
  // 📌 ROUTES (Grouped by Feature)
  // ===============================
  //

  // 🔐 AUTH & USER PROFILE
  app.use("/api/auth", auth);
  app.use("/api/profile", attachDevUser, profileRouter);
  app.use("/api/profile", attachDevUser, profilePhoto);
  app.use("/api/employment", attachDevUser, employmentRouter);

//   //Protection
//   app.use(csrfProtection);

// // Expose CSRF token to frontend
// app.get("/api/csrf-token", (req, res) => {
//   res.json({ csrfToken: req.csrfToken() });
// });



  // 📌 RECORDS / SKILLS
  app.use("/record", records);
  app.use("/api/skills", skills);
  app.use("/api/education", education);
  // TEAM ROUTES
  app.use("/api/teams", teamRoutes);
  app.use("/api/teams", teamProgressRouter);

  // 📂 PROJECTS & CERTIFICATIONS
  app.use("/api/projects", projectsRoutes);
  app.use("/api/projects", projectMediaRoutes);
  app.use("/api/certifications", certificationRoutes);
  app.use("/api/certifications", certificationBadgeRouter);
  // 💼 JOBS & SALARY
  app.use("/api/jobs", jobRoutes);
  app.use("/api/jobs", jobSalaryRoutes);

  // Salary Analytics (UC-100) — MUST COME FIRST
  app.use("/api/salary/analytics", salaryAnalyticsRoutes);
  // 🚀 START SERVER

  // Salary CRUD — MUST COME AFTER
  app.use("/api/salary", salaryRoutes);

  // 📊 INTERVIEW & COMPANY RESEARCH
  app.use("/api/interview-insights", attachDevUser, interviewRoutes);
  app.use("/api/interviews", interviewAnalyticsRoutes);
  app.use("/api/company/research", attachDevUser, companyResearch); //interview research
  app.use(companyResearch); // stand alone research for ANY company
  app.use("/api/interview-questions", interviewQuestions);
  app.use("/api/coaching-insights", coachingInsights);
  app.use("/api/practice-sessions", practiceSessions);
  app.use("/api/writing-practice", writingPracticeRoutes);
  app.use("/api/interview", interviewAnalyticsRoutes);
  app.use("/api/interview-predictions", interviewPredictionRoutes);

  // 📄 RESUMES + TEMPLATES
  app.use("/api/coverletter", coverletter);
  app.use("/api/resumes", attachDevUser, resumesRoute);
  app.use("/api/resume-templates", attachDevUser, templatesRoute);
  app.use("/api/resume-versions", resumeVersionsRouter);
  app.use("/api/coverletter-versions", coverletterVersionsRouter);

  //networking
  app.use("/api/networking", networkingRoutes);
  app.use("/api/networking", networkingDiscovery);
  app.use("/api/networking/outreach", outreachRoutes);

  //referrals
  app.use("/api/referrals", referralRoutes);
  //app.use("/api/referrals/sources", referralSources);

  //linkedin
  app.use("/api/linkedin", linkedinRoutes);

  // ⚙️ AUTOMATION
  app.use("/api/automation", automationRoutes);

  // 🔔 NOTIFICATIONS
  logger.info('⏰ Setting up notification cron jobs...');
  setupNotificationCron();
  setupApplicationSchedulerCron(); //added for application notifications
  setupSalaryRefreshCron();
  setupGitHubSyncCron();
  logger.info('✅ Cron jobs configured');

  app.use("/api/notifications", notificationRoutes);

  // 👥 NETWORKING
  app.use("/api/reference", reference);
  app.use("/api/peer-groups", peergroups);
  app.use("/api/supporters", supportersRoutes);
  app.use("/api/informational", informationalRoutes);
  app.use("/api/mentors", mentorRoutes);

  // 🎯 GOALS & PRODUCTIVITY
  app.use("/api/goals", attachDevUser, goalsRoutes);
  app.use("/api/smart-goals", attachDevUser, smartGoalsRoutes);
  app.use("/api/productivity", attachDevUser, productivityRoutes);

  // 📈 ANALYTICS
  app.use("/api/success-analysis", successAnalysisRouter);
  app.use("/api/success-patterns", successPatternsRouter);
  app.use(
    "/api/competitive-analysis",
    attachDevUser,
    competitiveAnalysisRouter
  );

  // 🤝 JOB SEARCH SHARING
  app.use("/api/job-search", jobSearchSharingRoutes);
  app.use("/api/advisors", advisorRoutes);

  app.use("/api/public", attachUserFromHeaders, jobseekersRoutes);
  app.use("/api/enterprise", attachUserFromHeaders, cohortRoutes);
  app.use("/api/enterprise", attachUserFromHeaders, enterpriseRoutes);
  app.use("/api/org", attachUserFromHeaders, organizationRoutes);

  // 📈 MARKET INTELLIGENCE (UC-102)
  app.use("/api/market", attachDevUser, marketRoutes);

  app.use("/api/referrals", referralRoutes);
  app.use("/api/offers", offersRouter);

  // Root route - confirms API is running
  app.get("/", (_req, res) => {
    res.json({
      message: "OnTrac API is running",
      version: "1.0.0",
      endpoints: "/api/*"
    });
  });
  // APPLICATION NOTIFICATION SERVICE
  app.use("/api/application-scheduler", attachDevUser, applicationSchedulerRoutes);
  app.use("/api/application-import", applicationImportRoutes);

  // Health check
  // ❤️ Health Check
  app.get("/healthz", (_req, res) => res.sendStatus(204));

  app.use("/api/success", successOverview);
  app.use("/api/success-snapshots", successSnapshots);
  app.use("/api/custom-reports", customReportsRouter);
  app.use("/api/github", githubRoutes);

  app.use(
    "/api/analytics/application-materials",
    attachDevUser,
    applicationMaterialsRouter
  );

  app.use(
    "/api/analytics/application-methods",
    attachDevUser,
    applicationMethodsRouter
  );

  app.use(
    "/api/analytics/application-timing",
    attachDevUser,
    applicationTimingRouter
  );

  app.use("/api/application-quality", applicationQualityRoutes);

  // Health check
  app.get("/healthz", (_req, res) => res.sendStatus(204));

  // Sentry test route
  app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("Sentry test error!");
  });

  Sentry.setupExpressErrorHandler(app);

  app.listen(PORT, () => {
    logger.info(`Server running on ${BASE}`);
    logger.info(`Server connected to ${DB}`);
  });
} catch (err) {
  logger.error("Failed to start server:", err);
  process.exit(1);
}