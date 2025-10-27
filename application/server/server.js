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

const PORT = process.env.PORT || 5050;
const BASE = process.env.BASE || `http://localhost:${PORT}`;

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-dev-user-id'],
}));

app.use(express.json());

// Start after DB connects
try {
  await connectDB();
  // Routes
  app.use('/record', records);
  app.use('/api/skills', skills);
  app.use('/api/auth', auth);
  app.use('/api/education', education);
  // Profile routes (optionally inject dev user)
  app.use('/api/profile', attachDevUser, profileRouter);

  // Health check
  app.get('/healthz', (_req, res) => res.sendStatus(204));
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}