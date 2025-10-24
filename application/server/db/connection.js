import dotenv from "dotenv";
import { MongoClient } from "mongodb"; 
dotenv.config();

let client;
let db;

export async function connectToServer() {
  // read env at call-time so dotenv is loaded
  const uri = process.env.ATLAS_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing ATLAS_URI or MONGO_URI in environment.");

  const DB_NAME = process.env.DB_NAME || "appdb";

  if (db) return db;                 
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[mongo] connected to ${DB_NAME}`);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call connectToServer() first.");
  return db;
}

export { connectToServer as connectDB };