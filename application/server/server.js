// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/connection.js';
import records from './routes/record.js';
import profile from './routes/profile.js';
import auth from './routes/auth.js';
import { attachDevUser } from './middleware/devUser.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// CORS must allow our custom header
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-dev-user-id'],
}));
app.use(express.json());

// Public routes
app.use('/record', records);
app.use('/api/auth', auth);

// Protected (dev) routes — require per-request user id
app.use('/api/users/me', attachDevUser, profile);

await connectDB(); // ensure DB connected and indexes created

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
