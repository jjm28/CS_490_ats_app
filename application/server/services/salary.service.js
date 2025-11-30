// salary.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

/* ============================================
   1️⃣ Get job from DB
   ============================================ */
export async function getJob({ userId, id }) {
  try {
    const db = getDb();
    
    // 🔍 Debug: Log what we're searching for
    console.log("🔍 Searching for job:", { 
      userId, 
      jobId: id,
      userIdType: typeof userId
    });
    
    // First, try to find the job by ID only
    const job = await db.collection("jobs").findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!job) {
      console.log("❌ Job not found with ID:", id);
      return null;
    }
    
    // 🔍 Debug: Log what userId is stored in the job
    console.log("📦 Found job with userId:", {
      storedUserId: job.userId,
      storedUserIdType: typeof job.userId,
      requestUserId: userId,
      match: job.userId === userId
    });
    
    // Optional: Check if userId matches (for security)
    // Comment this out if you want to allow all users to see salary data
    if (job.userId && job.userId !== userId) {
      console.warn("⚠️ userId mismatch - job belongs to different user");
      // Uncomment the next line if you want to enforce user ownership:
      // return null;
    }
    
    return job;
  } catch (err) {
    console.error("❌ Error fetching job:", err);
    return null;
  }
}

/* ============================================
   2️⃣ Get cached salary data
   ============================================ */
export async function getSalaryResearch(jobId) {
  try {
    const db = getDb();
    const data = await db.collection("salaryResearch").findOne({ 
      jobId: jobId 
    });
    return data;
  } catch (err) {
    console.error("Error fetching cached salary:", err);
    return null;
  }
}

/* ============================================
   3️⃣ Cache new salary data
   ============================================ */
export async function cacheSalaryData(jobId, data) {
  try {
    const db = getDb();
    const result = await db
      .collection("salaryResearch")
      .updateOne(
        { jobId: jobId },
        { 
          $set: {
            ...data,
            jobId: jobId,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    return result;
  } catch (err) {
    console.error("Error caching salary data:", err);
    throw err;
  }
}

/* ============================================
   4️⃣ Delete cached salary data (optional utility)
   ============================================ */
export async function deleteSalaryCache(jobId) {
  try {
    const db = getDb();
    await db.collection("salaryResearch").deleteOne({ jobId: jobId });
  } catch (err) {
    console.error("Error deleting salary cache:", err);
  }
}