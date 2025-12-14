import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which environment we're in
const environment = process.env.NODE_ENV || 'development';

// Load the appropriate .env file
const envFile = `.env.${environment}`;
const envPath = path.resolve(__dirname, '..', envFile);

console.log(`🔧 Loading environment: ${environment}`);
console.log(`📁 Environment file: ${envFile}`);

// Load the environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Error loading ${envFile}:`, result.error.message);
  console.error(`   Make sure ${envFile} exists in the server/ directory`);
  process.exit(1);
}

console.log(`✅ Environment loaded successfully`);

export default {
  env: environment,
  port: process.env.PORT || 5050,
  mongoUri: process.env.ATLAS_URI,
  dbName: process.env.DB_NAME,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  logLevel: process.env.LOG_LEVEL || (environment === 'development' ? 'debug' : 'error'), // Add this line
};