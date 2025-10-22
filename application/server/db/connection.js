// server/connection.js
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config(); 

const uri = process.env.ATLAS_URI;
if (!uri) {
  console.error(" Missing ATLAS_URI in .env file");
  process.exit(1);
}

// Create the Mongo client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

//  Function to connect once at server startup
export async function connectDB() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db("employees"); // your main database
    console.log(" Connected to MongoDB (employees)");
    return db;
  } catch (err) {
    console.error(" MongoDB connection failed:", err);
    process.exit(1);
  }
}

//  Function for other files to get the DB instance
export function getDb() {
  if (!db) throw new Error(" DB not initialized. Call connectDB() first.");
  return db;
}
