// services/education.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

/**
 * Get all education records for a given user.
 */
export async function getEducationByUserId(userId) {
  const db = getDb();
  // Match the collection & field names used in routes/education.js
  return db
    .collection("educationRecords")
    .find({ userId })
    .toArray();
}

/**
 * Optionally: get a single education record (if you ever need it).
 */
export async function getEducationById(userId, educationId) {
  const db = getDb();
  return db.collection("educationRecords").findOne({
    _id: new ObjectId(educationId),
    userId,
  });
}
