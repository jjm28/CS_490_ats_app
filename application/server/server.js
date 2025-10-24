// server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB } from './db/connection.js';
import records from './routes/record.js';
import auth from './routes/auth.js';
import profileRouter from './routes/profile.js';
import { attachDevUser } from './middleware/devUser.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({
  origin: true,
  credentials: true,
  //  allow dev/user headers + Authorization
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-dev-user-id'],
}));
app.use(express.json());

// Public routes
app.use('/record', records);
app.use('/api/auth', auth);

//  Profile routes (optionally inject a dev user per request)
//app.use('/api/profile', attachDevUser, profileRouter);
app.use('/api/profile', profileRouter);

// Health check
app.get('/healthz', (_req, res) => res.sendStatus(204));

// Start after DB connects
try {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
