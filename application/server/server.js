import 'dotenv/config'; // Loads env variables
import express from 'express';
import cors from 'cors';
import { connectDB } from './db/connection.js';
import records from './routes/record.js';
import skills from './routes/skills.js';
import auth from './routes/auth.js';
import profileRouter from './routes/profile.js';
import education from './routes/education.js';
import { attachDevUser } from './middleware/devUser.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import profilePhoto from './routes/profile-photo.js';
import employmentRouter from './routes/employment.js';
import projectMediaRoutes from "./routes/project-media.js";
import certificationRoutes from "./routes/certifications.js";
import projectsRoutes from "./routes/projects.js";
import companyResearch from './routes/company-research.js';
import coverletter from './routes/coverletter.js'
import jobRoutes from './routes/jobs.js'
import salaryRouter from "./routes/salary.js";
import resumesRoute from "./routes/resume.js";
import templatesRoute from "./routes/templates.js";   
import interviewRoutes from "./routes/interview-insights.js";            
import { ensureSystemTemplates } from './services/templates.service.js';
import resumeVersionsRouter from "./routes/resume-versions.js";
import automationRoutes from "./routes/automation.js";
import { startAutomationRunner } from "./utils/automationRunner.js";
import { setupNotificationCron } from './jobs/notificationcron.js';
import notificationRoutes from './routes/notifications.js';
import reference from './routes/reference.js'
import peergroups from './routes/peerGroups.js'
import goalsRoutes from "./routes/goals.js";
import successAnalysisRouter from "./routes/success-analysis.js";
import successPatternsRouter from "./routes/success-patterns.js";
import interviewAnalyticsRoutes from "./routes/interviews.js";
import supportersRoutes from "./routes/supporters.js";

const PORT = process.env.PORT || 5050;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
const DB = process.env.DB_NAME || 'appdb'

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


// Start after DB connects
try {
  await connectDB();
  await ensureSystemTemplates();
  // Routes
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use('/record', records);
  app.use('/api/skills', skills);
  app.use('/api/auth', auth);
  app.use('/api/education', education);
  app.use("/api/certifications", certificationRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/projects", projectMediaRoutes);

  // Profile routes (optionally inject dev user)
  app.use('/api/profile', attachDevUser, profileRouter);
  app.use('/api/profile', attachDevUser, profilePhoto);
  app.use('/api/employment', attachDevUser, employmentRouter);

  // Job routes  
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use('/api/jobs', jobRoutes);

 app.use("/api/interview-insights", attachDevUser, interviewRoutes);
  app.use(companyResearch);
  app.use('/api/salary', salaryRouter);
  // for picture uploads
  app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'), {
      etag: false,
      lastModified: false,
      cacheControl: false,
      setHeaders: (res) => res.set('Cache-Control', 'no-store'),
    })
  );
  app.use('/api/coverletter', coverletter)

  //resume routes
  app.use("/api/resumes", attachDevUser, resumesRoute);
  app.use('/api/resume-templates', attachDevUser, templatesRoute);
  app.use("/api/resume-versions", resumeVersionsRouter);


  // Notification routes and cron job
  // After DB connects:
  setupNotificationCron();

  // With routes (protected by auth):
  app.use('/api/notifications', notificationRoutes);

  // References Routes
  app.use('/api/reference', reference)
  // Peer groups Routes
  app.use('/api/peer-groups', peergroups)

  app.use("/api/goals", attachDevUser, goalsRoutes);

  app.use("/api/success-analysis", successAnalysisRouter);
  app.use("/api/success-patterns", successPatternsRouter);

  app.use("/api/interviews", interviewAnalyticsRoutes);
  app.use("/api/supporters", supportersRoutes);
  // Health check
  app.get('/healthz', (_req, res) => res.sendStatus(204));
  app.listen(PORT, () => {
    console.log(`Server running on ${BASE}`);
    console.log(`Server connected to ${DB}`)
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}