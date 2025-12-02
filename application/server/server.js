import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// 🧠 DB / Core Services
import { connectDB } from './db/connection.js';
import { ensureSystemTemplates } from './services/templates.service.js';
import { startAutomationRunner } from "./utils/automationRunner.js";
import { setupNotificationCron } from './jobs/notificationcron.js';

// 🧩 Middleware
import { attachDevUser } from './middleware/devUser.js';

//
// ===============================
// 📁 FEATURE IMPORTS (Grouped)
// ===============================
//

// 🔐 AUTH / USER
import auth from './routes/auth.js';
import profileRouter from './routes/profile.js';
import profilePhoto from './routes/profile-photo.js';
import education from './routes/education.js';
import employmentRouter from './routes/employment.js';

// 📌 CORE USER RECORDS + SKILLS
import records from './routes/record.js';
import skills from './routes/skills.js';

// 📂 PROJECTS & CERTIFICATIONS
import projectsRoutes from "./routes/projects.js";
import projectMediaRoutes from "./routes/project-media.js";
import certificationRoutes from "./routes/certifications.js";

// 💼 JOBS & SALARY
import jobRoutes from './routes/jobs.js';
import jobSalaryRoutes from "./routes/jobs-salary.js";
import salaryRoutes from "./routes/salary.js";
import salaryRouter from "./routes/salary.js";
import salaryAnalyticsRoutes from "./routes/salary-analytics.js";

// 📊 INTERVIEW & COMPANY RESEARCH
import interviewRoutes from './routes/interview-insights.js';
import interviewAnalyticsRoutes from "./routes/interviews.js";
import companyResearch from './routes/company-research.js';
import interviewQuestions from "./routes/interview-questions.js";
import coachingInsights from "./routes/coachinginsights.js";

// 📄 RESUME + COVER LETTERS
import coverletter from './routes/coverletter.js';
import resumesRoute from "./routes/resume.js";
import templatesRoute from "./routes/templates.js";
import resumeVersionsRouter from "./routes/resume-versions.js";

// ⚙️ AUTOMATION
import automationRoutes from "./routes/automation.js";

// 🔔 NOTIFICATIONS
import notificationRoutes from './routes/notifications.js';

// 👥 NETWORKING
import reference from './routes/reference.js';
import peergroups from './routes/peerGroups.js';
import supportersRoutes from "./routes/supporters.js";

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
import advisorRoutes from "./routes/advisor.routes.js";

const PORT = process.env.PORT || 5050;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
const DB = process.env.DB_NAME || 'appdb';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('baseUrl', BASE);

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-dev-user-id'],
}));
app.use(express.json());
app.use(cookieParser());

//
// ===============================
// 📸 STATIC UPLOADS
// ===============================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    setHeaders: (res) => res.set('Cache-Control', 'no-store'),
  })
);

//
// ===============================
// 🚀 START AFTER DB CONNECTS
// ===============================
try {
  await connectDB();
  await ensureSystemTemplates();

  //
  // ===============================
  // 📌 ROUTES (Grouped by Feature)
  // ===============================
  //

  // 🔐 AUTH & USER PROFILE
  app.use('/api/auth', auth);
  app.use('/api/profile', attachDevUser, profileRouter);
  app.use('/api/profile', attachDevUser, profilePhoto);
  app.use('/api/employment', attachDevUser, employmentRouter);

  // 📌 RECORDS / SKILLS
  app.use('/record', records);
  app.use('/api/skills', skills);
  app.use('/api/education', education);

  // 📂 PROJECTS & CERTIFICATIONS
  app.use("/api/projects", projectsRoutes);
  app.use("/api/projects", projectMediaRoutes);
  app.use("/api/certifications", certificationRoutes);

  // 💼 JOBS & SALARY
  app.use('/api/jobs', jobRoutes);
  app.use("/api/jobs", jobSalaryRoutes);
  app.use('/api/salary', salaryRouter);
  app.use("/api/salary/analytics", salaryAnalyticsRoutes);

  // 📊 INTERVIEW & COMPANY RESEARCH
  app.use("/api/interview-insights", attachDevUser, interviewRoutes);
  app.use("/api/interviews", interviewAnalyticsRoutes);
  app.use("/api/company/research", attachDevUser, companyResearch); //interview research 
  app.use(companyResearch); // stand alone research for ANY company
  app.use("/api/interview-questions", interviewQuestions);
  app.use("/api/coaching-insights", coachingInsights);
  app.use('/api/writing-practice', writingPracticeRoutes);

  // 📄 RESUMES + COVER LETTERS
  app.use('/api/coverletter', coverletter);
  app.use("/api/resumes", attachDevUser, resumesRoute);
  app.use('/api/resume-templates', attachDevUser, templatesRoute);
  app.use("/api/resume-versions", resumeVersionsRouter);

  //networking 
  //app.use("/api/networking", networkingRoutes);
  //app.use("/api/networking/outreach", outreachRoutes);

  // 🔔 NOTIFICATIONS (Must be after DB)
  setupNotificationCron();
  app.use('/api/notifications', notificationRoutes);

  // 👥 NETWORKING
  app.use('/api/reference', reference);
  app.use('/api/peer-groups', peergroups);
  app.use("/api/supporters", supportersRoutes);

  // 🎯 GOALS & PRODUCTIVITY
  app.use("/api/goals", attachDevUser, goalsRoutes);
  app.use("/api/smart-goals", attachDevUser, smartGoalsRoutes);
  app.use("/api/productivity", attachDevUser, productivityRoutes);
  app.use("/api/productivity", productivityRoutes); // duplicate?

  // 📈 ANALYTICS / SUCCESS TRACKING
  app.use("/api/success-analysis", successAnalysisRouter);
  app.use("/api/success-patterns", successPatternsRouter);
  app.use("/api/competitive-analysis", attachDevUser, competitiveAnalysisRouter);

  app.use("/api/interviews", interviewAnalyticsRoutes);
  app.use("/api/supporters", supportersRoutes);

  //productivity 
  app.use("/api/productivity", productivityRoutes);
  app.use("/api/smart-goals", attachDevUser, smartGoalsRoutes);
  app.use("/api/productivity", attachDevUser,productivityRoutes);

  //competitive applicant analysis
  app.use("/api/competitive-analysis", attachDevUser,competitiveAnalysisRouter);

  app.use("/api", jobSearchSharingRoutes);
  app.use("/api", advisorRoutes);

  // Health check
  // ❤️ Health Check
  app.get('/healthz', (_req, res) => res.sendStatus(204));

  // 🚀 START SERVER
  app.listen(PORT, () => {
    console.log(`Server running on ${BASE}`);
    console.log(`Server connected to ${DB}`);
  });

} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
