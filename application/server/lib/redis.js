import Redis from "ioredis";

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
      console.warn("⚠️ Redis error, caching disabled:", err.message);
      redis = null;
    });
  } catch (err) {
    console.warn("⚠️ Redis init failed, caching disabled");
    redis = null;
  }
} else {
  console.log("ℹ️ No REDIS_URL set — caching disabled");
}

export default redis;
