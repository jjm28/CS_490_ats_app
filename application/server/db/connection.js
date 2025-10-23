// server/db/connection.js
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client;
let db;

export async function connectDB() {
  if (db) return db;

  const uri = process.env.ATLAS_URI || '';
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    console.error('❌ Missing/invalid ATLAS_URI in .env');
    process.exit(1);
  }

  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  await client.connect();
  db = client.db('employees'); // <- use your DB name

  // one-time safe indexes (re-run is fine)
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('profiles').createIndex({ userId: 1 }, { unique: true });

  console.log('✅ Connected to MongoDB (employees)');
  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return db;
}
