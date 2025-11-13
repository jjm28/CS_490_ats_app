// services/projects.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

/**
 * Get all projects for a given user.
 */
export async function getProjectsByUserId(userId) {
  const db = getDb();
  // Match collection name used in routes/projects.js
  return db
    .collection("projects")
    .find({ userId })
    .toArray();
}

/**
 * Optionally: get a single project.
 */
export async function getProjectById(userId, projectId) {
  const db = getDb();
  return db.collection("projects").findOne({
    _id: new ObjectId(projectId),
    userId,
  });
}
