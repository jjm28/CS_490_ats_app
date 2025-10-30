import express from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connection.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

const router = express.Router();

// ✅ Small helper to decode the token
function getUserIdFromToken(req) {
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

// ✅ Get all education entries for a specific user
router.get("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();
    const education = await db
      .collection("education")
      .find({ userId })
      .toArray();
    res.status(200).json(education);
  } catch (err) {
    res.status(500).json({ message: "Error fetching education", error: err });
  }
});

// ✅ Add a new education entry
router.post("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      institution,
      degree,
      fieldOfStudy,
      graduationDate,
      gpa,
      isPrivateGpa,
      currentlyEnrolled,
      educationLevel,
      achievements,
    } = req.body;

    if (!institution || !degree || !fieldOfStudy || !educationLevel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();
    const newEducation = {
      institution,
      degree,
      fieldOfStudy,
      graduationDate,
      gpa,
      isPrivateGpa,
      currentlyEnrolled,
      educationLevel,
      achievements,
      userId, // ✅ store which user this belongs to
    };

    const result = await db.collection("education").insertOne(newEducation);
    res.status(201).json({ _id: result.insertedId, ...newEducation });
  } catch (err) {
    res.status(500).json({ message: "Error adding education", error: err });
  }
});

// ✅ Update education entry
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const updatedEducation = req.body;
    const db = getDb();

    const result = await db
      .collection("education")
      .updateOne(
        { _id: new ObjectId(id), userId }, // ✅ ensure only owner can update
        { $set: updatedEducation }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Education entry not found" });
    }

    const updatedDoc = await db
      .collection("education")
      .findOne({ _id: new ObjectId(id) });
    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: "Error updating education", error: err });
  }
});

// ✅ Delete education entry
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const db = getDb();
    const result = await db
      .collection("education")
      .deleteOne({ _id: new ObjectId(id), userId }); // ✅ user-specific delete

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Education entry not found" });
    }

    res.status(200).json({ message: "Education deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting education", error: err });
  }
});

export default router;