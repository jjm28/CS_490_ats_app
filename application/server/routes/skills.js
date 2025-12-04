import express from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import "dotenv/config";

const router = express.Router();

/* ============================================================
   Extract user ID from JWT OR from x-dev-user-id (dev mode)
============================================================ */
function resolveUserId(req) {
  // 1️⃣ Dev mode override
  if (req.headers["x-dev-user-id"]) {
    return req.headers["x-dev-user-id"];
  }

  // 2️⃣ Standard JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (error) {
    return null;
  }
}

/* ============================================================
   GET all user skills
============================================================ */
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();
    const skills = await db.collection("skills").find({ userId }).toArray();

    res.status(200).json(skills);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Error fetching skills" });
  }
});

/* ============================================================
   ADD new skill
============================================================ */
router.post("/", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, category, proficiency } = req.body;
    if (!name || !category || !proficiency) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();

    const existingSkill = await db.collection("skills").findOne({ name, userId });
    if (existingSkill) {
      return res.status(409).json({ message: "Skill already exists for this user" });
    }

    const newSkill = { name, category, proficiency, userId };
    const result = await db.collection("skills").insertOne(newSkill);

    res.status(201).json({ _id: result.insertedId, ...newSkill });
  } catch (err) {
    console.error("Error adding skill:", err);
    res.status(500).json({ message: "Error adding skill" });
  }
});

/* ============================================================
   UPDATE skill
============================================================ */
router.put("/:id", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const updatedSkill = req.body;

    const db = getDb();

    const result = await db
      .collection("skills")
      .updateOne({ _id: new ObjectId(id), userId }, { $set: updatedSkill });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Skill not found or unauthorized" });
    }

    res.status(200).json({ message: "Skill updated successfully" });
  } catch (err) {
    console.error("Error updating skill:", err);
    res.status(500).json({ message: "Error updating skill" });
  }
});

/* ============================================================
   DELETE skill
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const db = getDb();

    const result = await db
      .collection("skills")
      .deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Skill not found or unauthorized" });
    }

    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (err) {
    console.error("Error deleting skill:", err);
    res.status(500).json({ message: "Error deleting skill" });
  }
});

/* ============================================================
   GET skills by user (exported util)
============================================================ */
export async function getSkillsByUser(userId) {
  const db = getDb();
  return await db.collection("skills").find({ userId }).toArray();
}

export default router;