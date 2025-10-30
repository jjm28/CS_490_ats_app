import express from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import "dotenv/config";

const router = express.Router();

// Helper to extract userId from JWT
function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

// ✅ GET: Get all certifications for the logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();
    const certifications = await db
      .collection("certifications")
      .find({ userId })
      .toArray();

    res.status(200).json(certifications);
  } catch (err) {
    res.status(500).json({ message: "Error fetching certifications", error: err });
  }
});

// ✅ POST: Add a new certification
router.post("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      name,
      organization,
      dateEarned,
      expirationDate,
      doesNotExpire,
      certificationId,
      documentUrl,
      verified,
      renewalReminder,
      category,
    } = req.body;

    if (!name || !organization || !dateEarned) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();
    const newCert = {
      name,
      organization,
      dateEarned,
      expirationDate,
      doesNotExpire,
      certificationId,
      documentUrl,
      verified,
      renewalReminder,
      category,
      userId,
    };

    const result = await db.collection("certifications").insertOne(newCert);
    res.status(201).json({ _id: result.insertedId, ...newCert });
  } catch (err) {
    res.status(500).json({ message: "Error adding certification", error: err });
  }
});

// ✅ PUT: Update a certification
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const updatedCert = req.body;
    const db = getDb();

    const result = await db
      .collection("certifications")
      .updateOne({ _id: new ObjectId(id), userId }, { $set: updatedCert });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Certification not found or unauthorized" });
    }

    const updatedDoc = await db
      .collection("certifications")
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: "Error updating certification", error: err });
  }
});

// ✅ DELETE: Delete a certification
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const db = getDb();

    const result = await db
      .collection("certifications")
      .deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Certification not found or unauthorized" });
    }

    res.status(200).json({ message: "Certification deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting certification", error: err });
  }
});

export default router;