import express from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import "dotenv/config";

const router = express.Router();

// 🔐 Helper to extract userId from JWT
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

// ✅ GET: Fetch all projects for logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();
    const projects = await db.collection("projects").find({ userId }).toArray();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects", error: err });
  }
});

// ✅ POST: Add a new project
router.post("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      name,
      description,
      role,
      startDate,
      endDate,
      technologies,
      url,
      teamSize,
      collaborationDetails,
      outcomes,
      industry,
      status,
      mediaUrl,
    } = req.body;

    if (!name || !description || !role || !startDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();
    const newProject = {
      name,
      description,
      role,
      startDate,
      endDate,
      technologies,
      url,
      teamSize,
      collaborationDetails,
      outcomes,
      industry,
      status,
      mediaUrl,
      userId,
    };

    const result = await db.collection("projects").insertOne(newProject);
    res.status(201).json({ _id: result.insertedId, ...newProject });
  } catch (err) {
    res.status(500).json({ message: "Error adding project", error: err });
  }
});

// ✅ PUT: Update a project
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const updatedProject = req.body;

    const db = getDb();
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id), userId }, { $set: updatedProject });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    const updatedDoc = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: "Error updating project", error: err });
  }
});

// ✅ DELETE: Delete a project
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const db = getDb();

    const result = await db
      .collection("projects")
      .deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting project", error: err });
  }
});

export default router;