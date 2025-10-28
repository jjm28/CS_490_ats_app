// application/server/db/connection.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const URI =
  process.env.ATLAS_URI ||
  process.env.MONGO_URI;

const DB_NAME = process.env.DB_NAME || 'appdb';

if (!URI) {
  throw new Error(
    'Missing Mongo URI. Set MONGODB_URI (or ATLAS_URI / MONGO_URI) in your environment.'
  );
}

// Optional: tweak Mongoose defaults
mongoose.set('strictQuery', false);

let nativeClient = null; // only created if you explicitly call connectNative()
let nativeDb = null;

/**
 * Connect to Mongo using Mongoose (primary path for apps using Mongoose models).
 */
export async function connectDB() {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  if (state === 1 || state === 2) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(URI, {
     
    });
    console.log(`[mongo] Mongoose connected: ${redactUriDb(URI)}`);
    return mongoose.connection;
  } catch (err) {
    console.error(' [mongo] Mongoose connection error:', err.message);
    throw err;
  }
}

/**
 * Optional: connect a native MongoDB client if you need low-level access.
 * Most apps won't need this if they use Mongoose schemas.
 */
export async function connectNative() {
  if (nativeDb) return nativeDb;

  try {
    nativeClient = new MongoClient(URI);
    await nativeClient.connect();
    nativeDb = nativeClient.db(DB_NAME);
    console.log(`[mongo] Native driver connected to DB: ${nativeDb.databaseName}`);
    return nativeDb;
  } catch (err) {
    console.error('[mongo] Native driver connection error:', err.message);
    throw err;
  }
}

/**
 * Returns a database handle.
 */
export function getDb() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }
  if (nativeDb) return nativeDb;
  throw new Error('Database not initialized. Call connectDB() (or connectNative()) first.');
}

/** Simple ping to verify DB health. */
export async function checkDatabaseHealth() {
  const db = getDb();
  await db.admin().command({ ping: 1 });
  return { ok: true };
}

/** Close all DB connections (for shutdown or tests). */
export async function closeDB() {
  const tasks = [];
  if (mongoose.connection.readyState !== 0) {
    tasks.push(mongoose.disconnect());
  }
  if (nativeClient) {
    tasks.push(nativeClient.close(true));
    nativeClient = null;
    nativeDb = null;
  }
  await Promise.all(tasks);
  console.log(' [mongo] Connections closed');
}

/** Helper: redact user/pass in logs and show db name if present. */
function redactUriDb(uri) {
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      u.username = u.username ? '***' : '';
      u.password = u.password ? '***' : '';
    }
    return u.toString();
  } catch {
    return uri;
  }
}

export { connectDB as connectToServer };
